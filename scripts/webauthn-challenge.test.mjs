import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {beforeEach, describe, test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {drizzle} from 'drizzle-orm/pg-proxy';
import {sha256} from '@oslojs/crypto/sha2';
import {encodeHexLowerCase} from '@oslojs/encoding';

const require = createRequire(import.meta.url);

function load(path, imports = {}) {
    const source = ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
    }).outputText;
    const exports = {};
    vm.runInNewContext(source, {
        exports,
        crypto,
        TextEncoder,
        Date,
        Uint8Array,
        console,
        require: name => name in imports ? imports[name] : require(name)
    }, {filename: path});
    return exports;
}

const constants = load('src/lib/constants.ts');
const shoppingList = load('src/lib/shopping-list.ts');
const schema = load('src/lib/server/db/schema.ts', {
    '../../constants': constants,
    '../../shopping-list': shoppingList
});

/** @type {Map<string, {id: string, challenge: string, purpose: string, userId: string | null, expiresAt: Date}>} */
const challengeStore = new Map();
let queries = [];

function toTime(value) {
    return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

const db = drizzle(async (sql, params) => {
    queries.push({sql, params});

    // Opportunistic expired challenge cleanup:
    // delete from "webauthn_challenge" where "webauthn_challenge"."expires_at" < $1
    if (sql === 'delete from "webauthn_challenge" where "webauthn_challenge"."expires_at" < $1') {
        const cutoff = toTime(params[0]);
        for (const [id, row] of challengeStore.entries()) {
            if (row.expiresAt.getTime() < cutoff) {
                challengeStore.delete(id);
            }
        }
        return {rows: []};
    }

    // Insert challenge:
    // insert into "webauthn_challenge" ("id", "challenge", "purpose", "user_id", "expires_at") values ($1, $2, $3, $4, $5)
    if (sql.startsWith('insert into "webauthn_challenge"')) {
        const [id, challenge, purpose, userId, expiresAt] = params;
        assert.equal(challengeStore.has(id), false, 'Duplicate challenge token hash');
        challengeStore.set(id, {
            id,
            challenge,
            purpose,
            userId: userId ?? null,
            expiresAt: new Date(toTime(expiresAt))
        });
        return {rows: []};
    }

    // Atomic consume challenge with user_id IS NULL (authentication):
    if (
        sql.startsWith('delete from "webauthn_challenge" where') &&
        sql.includes('"webauthn_challenge"."id" = $1') &&
        sql.includes('"webauthn_challenge"."purpose" = $2') &&
        sql.includes('"webauthn_challenge"."expires_at" > $3') &&
        sql.includes('"webauthn_challenge"."user_id" is null') &&
        sql.includes('returning "challenge"')
    ) {
        const [id, purpose, now] = params;
        const row = challengeStore.get(id);
        if (
            row &&
            row.purpose === purpose &&
            row.expiresAt.getTime() > toTime(now) &&
            row.userId === null
        ) {
            challengeStore.delete(id);
            return {rows: [[row.challenge]]};
        }
        return {rows: []};
    }

    // Atomic consume challenge with user_id = $4 (registration):
    if (
        sql.startsWith('delete from "webauthn_challenge" where') &&
        sql.includes('"webauthn_challenge"."id" = $1') &&
        sql.includes('"webauthn_challenge"."purpose" = $2') &&
        sql.includes('"webauthn_challenge"."expires_at" > $3') &&
        sql.includes('"webauthn_challenge"."user_id" = $4') &&
        sql.includes('returning "challenge"')
    ) {
        const [id, purpose, now, expectedUserId] = params;
        const row = challengeStore.get(id);
        if (
            row &&
            row.purpose === purpose &&
            row.expiresAt.getTime() > toTime(now) &&
            row.userId === expectedUserId
        ) {
            challengeStore.delete(id);
            return {rows: [[row.challenge]]};
        }
        return {rows: []};
    }

    throw new Error(`Unexpected SQL in webauthn test: ${sql}`);
});

const kitMock = {
    error: (status, message) => Object.assign(new Error(message), {status}),
    json: (data) => ({status: 200, body: data})
};

const webauthn = load('src/lib/server/webauthn.ts', {
    '$lib/server/db': {getDb: () => db},
    '$lib/server/db/schema': schema
});
const authRateLimit = load('src/lib/server/auth-rate-limit.ts');

let nextGeneratedChallenge = 'server-generated-challenge-1';
let authVerifyCalls = [];
let regVerifyCalls = [];
let createdPasskeys = [];
let updatedCounters = [];
let createdSessions = [];
let setSessionCookies = [];

const simpleWebauthnMock = {
    generateAuthenticationOptions: async () => ({challenge: nextGeneratedChallenge}),
    generateRegistrationOptions: async () => ({challenge: nextGeneratedChallenge}),
    verifyAuthenticationResponse: async (args) => {
        authVerifyCalls.push(args);
        return {
            verified: args.response.clientChallenge === args.expectedChallenge,
            authenticationInfo: {newCounter: 2}
        };
    },
    verifyRegistrationResponse: async (args) => {
        regVerifyCalls.push(args);
        return {
            verified: args.response.clientChallenge === args.expectedChallenge,
            registrationInfo: {
                credential: {
                    id: args.response.id,
                    publicKey: new Uint8Array([1, 2, 3, 4]),
                    counter: 1,
                    transports: ['internal']
                }
            }
        };
    }
};

const passkeyDbMock = {
    getPasskeyById: async (id) => ({
        id,
        userId: 'alice',
        publicKey: 'AQIDBA',
        counter: 1,
        transports: 'internal'
    }),
    getPasskeysByUserId: async () => [],
    updatePasskeyCounter: async (id, counter) => {
        updatedCounters.push({id, counter});
    },
    createPasskey: async (record) => {
        createdPasskeys.push(record);
    }
};

const authMock = {
    generateSessionToken: () => 'session-token-123',
    createSession: async (token, userId) => {
        const session = {id: 'hashed-session', userId, expiresAt: new Date(Date.now() + 60_000)};
        createdSessions.push({token, userId});
        return session;
    },
    setSessionTokenCookie: (_event, token, session) => {
        setSessionCookies.push({token, userId: session.userId});
    }
};

const loginOptions = load('src/routes/(auth)/login/passkey/options/+server.ts', {
    '@sveltejs/kit': kitMock,
    '@simplewebauthn/server': simpleWebauthnMock,
    '$lib/server/webauthn': webauthn,
    '$lib/server/auth-rate-limit': authRateLimit
});

const loginVerify = load('src/routes/(auth)/login/passkey/verify/+server.ts', {
    '@sveltejs/kit': kitMock,
    '@simplewebauthn/server': simpleWebauthnMock,
    '@simplewebauthn/server/helpers': {
        isoBase64URL: {
            toBuffer: () => new Uint8Array([1, 2, 3, 4]),
            fromBuffer: () => 'AQIDBA'
        }
    },
    '$lib/server/auth': authMock,
    '$lib/server/db/passkey': passkeyDbMock,
    '$lib/server/webauthn': webauthn,
    '$lib/server/auth-rate-limit': authRateLimit
});

const settingsOptions = load('src/routes/(app)/settings/passkey/options/+server.ts', {
    '@sveltejs/kit': kitMock,
    '@simplewebauthn/server': simpleWebauthnMock,
    '$lib/server/db/passkey': passkeyDbMock,
    '$lib/server/webauthn': webauthn
});

const settingsVerify = load('src/routes/(app)/settings/passkey/verify/+server.ts', {
    '@sveltejs/kit': kitMock,
    '@simplewebauthn/server': simpleWebauthnMock,
    '@simplewebauthn/server/helpers': {
        isoBase64URL: {
            toBuffer: () => new Uint8Array([1, 2, 3, 4]),
            fromBuffer: () => 'AQIDBA'
        }
    },
    '$lib/server/db/passkey': passkeyDbMock,
    '$lib/server/webauthn': webauthn
});

function createCookieJar(initial = {}) {
    const store = new Map(Object.entries(initial));
    const setCalls = [];
    const deleteCalls = [];
    return {
        get: (name) => store.get(name),
        set: (name, value, opts) => {
            store.set(name, value);
            setCalls.push({name, value, opts});
        },
        delete: (name, opts) => {
            store.delete(name);
            deleteCalls.push({name, opts});
        },
        setCalls,
        deleteCalls
    };
}

function makeEvent({url = 'https://cookify.example/login/passkey', cookies = createCookieJar(), user = null, body = null} = {}) {
    return {
        url: new URL(url),
        cookies,
        locals: {user},
        request: {
            json: async () => body
        }
    };
}

function sha256Hex(value) {
    return encodeHexLowerCase(sha256(new TextEncoder().encode(value)));
}

describe('server-side single-use WebAuthn challenge storage', () => {
    beforeEach(() => {
        authRateLimit.clearAuthRateLimits();
        challengeStore.clear();
        queries = [];
        authVerifyCalls = [];
        regVerifyCalls = [];
        createdPasskeys = [];
        updatedCounters = [];
        createdSessions = [];
        setSessionCookies = [];
        nextGeneratedChallenge = 'server-generated-challenge-1';
    });

    test('login options + verify stores hashed token in DB, sets HttpOnly cookie, verifies once, and rejects replay', async () => {
        const cookies = createCookieJar();
        const optRes = await loginOptions.POST(makeEvent({cookies}));
        assert.equal(optRes.body.challenge, 'server-generated-challenge-1');

        assert.equal(cookies.setCalls.length, 1);
        const cookieSet = cookies.setCalls[0];
        assert.equal(cookieSet.name, 'passkey-challenge');
        assert.notEqual(cookieSet.value, 'server-generated-challenge-1', 'Cookie must hold opaque token, not raw challenge');
        assert.deepEqual({...cookieSet.opts}, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: true,
            maxAge: 300
        });

        const opaqueToken = cookieSet.value;
        const expectedHash = sha256Hex(opaqueToken);
        assert.equal(challengeStore.size, 1);
        assert.equal(challengeStore.has(opaqueToken), false, 'DB must not store raw opaque token');
        assert.equal(challengeStore.has('server-generated-challenge-1'), false, 'DB primary key must not be raw challenge');
        const stored = challengeStore.get(expectedHash);
        assert.ok(stored, 'DB must store row keyed by SHA-256 hash of opaque token');
        assert.equal(stored.challenge, 'server-generated-challenge-1');
        assert.equal(stored.purpose, 'authentication');
        assert.equal(stored.userId, null);
        assert.ok(stored.expiresAt.getTime() > Date.now());

        // First verification succeeds and consumes challenge
        const verifyRes = await loginVerify.POST(makeEvent({
            cookies,
            body: {id: 'cred-1', clientChallenge: 'server-generated-challenge-1'}
        }));
        assert.deepEqual({...verifyRes.body}, {success: true});
        assert.equal(authVerifyCalls.length, 1);
        assert.equal(authVerifyCalls[0].expectedChallenge, 'server-generated-challenge-1');
        assert.equal(challengeStore.size, 0, 'Consumed challenge row must be deleted from DB');
        assert.equal(cookies.get('passkey-challenge'), undefined, 'Cookie must be cleared on consumption');
        assert.equal(createdSessions.length, 1);
        assert.equal(updatedCounters.length, 1);

        // Replay with the exact same captured cookie is rejected
        const replayCookies = createCookieJar({'passkey-challenge': opaqueToken});
        await assert.rejects(
            () => loginVerify.POST(makeEvent({
                cookies: replayCookies,
                body: {id: 'cred-1', clientChallenge: 'server-generated-challenge-1'}
            })),
            {status: 400, message: 'Challenge expired'}
        );
        assert.equal(authVerifyCalls.length, 1, 'Replay must not reach verifyAuthenticationResponse');
        assert.equal(createdSessions.length, 1, 'Replay must not create a second session');
        assert.equal(replayCookies.get('passkey-challenge'), undefined);
    });

    test('forged client cookies (unknown token, raw challenge, or malformed value) are rejected with 400', async () => {
        // Issue a legitimate challenge first so the DB is non-empty
        const legitCookies = createCookieJar();
        await loginOptions.POST(makeEvent({cookies: legitCookies}));
        assert.equal(challengeStore.size, 1);

        // Forged unknown token
        const unknownCookies = createCookieJar({'passkey-challenge': 'forged-unknown-token-value'});
        await assert.rejects(
            () => loginVerify.POST(makeEvent({
                cookies: unknownCookies,
                body: {id: 'cred-1', clientChallenge: 'server-generated-challenge-1'}
            })),
            {status: 400, message: 'Challenge expired'}
        );

        // Raw WebAuthn challenge placed directly in cookie (old attack vector)
        const rawChallengeCookies = createCookieJar({'passkey-challenge': 'server-generated-challenge-1'});
        await assert.rejects(
            () => loginVerify.POST(makeEvent({
                cookies: rawChallengeCookies,
                body: {id: 'cred-1', clientChallenge: 'server-generated-challenge-1'}
            })),
            {status: 400, message: 'Challenge expired'}
        );

        // Missing or malformed cookie
        for (const badCookie of [undefined, '', 'bad cookie with spaces!']) {
            const badJar = createCookieJar(badCookie === undefined ? {} : {'passkey-challenge': badCookie});
            await assert.rejects(
                () => loginVerify.POST(makeEvent({
                    cookies: badJar,
                    body: {id: 'cred-1', clientChallenge: 'server-generated-challenge-1'}
                })),
                {status: 400, message: 'Challenge expired'}
            );
        }

        assert.equal(authVerifyCalls.length, 0);
        assert.equal(challengeStore.size, 1, 'Forged attempts must not consume the legitimate challenge');
    });

    test('expired challenge is rejected with 400 and pruned opportunistically on next create', async () => {
        const cookies = createCookieJar();
        await loginOptions.POST(makeEvent({cookies}));
        const token = cookies.get('passkey-challenge');
        const hash = sha256Hex(token);

        // Force expiration in DB
        const row = challengeStore.get(hash);
        row.expiresAt = new Date(Date.now() - 1000);

        await assert.rejects(
            () => loginVerify.POST(makeEvent({
                cookies,
                body: {id: 'cred-1', clientChallenge: 'server-generated-challenge-1'}
            })),
            {status: 400, message: 'Challenge expired'}
        );
        assert.equal(authVerifyCalls.length, 0);
        assert.equal(challengeStore.has(hash), true, 'Expired row was not matched by consume');

        // Creating a fresh challenge opportunistically deletes expired rows
        nextGeneratedChallenge = 'server-generated-challenge-2';
        await loginOptions.POST(makeEvent({cookies: createCookieJar()}));
        assert.equal(challengeStore.has(hash), false, 'Expired challenge must be purged on next createChallenge');
        assert.equal(challengeStore.size, 1);
    });

    test('authentication challenge cannot be consumed by registration verify and vice versa', async () => {
        const alice = {id: 'alice', username: 'alice'};

        // 1. Auth challenge rejected by registration verify
        const authCookies = createCookieJar();
        nextGeneratedChallenge = 'auth-only-challenge';
        await loginOptions.POST(makeEvent({cookies: authCookies}));
        const authToken = authCookies.get('passkey-challenge');

        await assert.rejects(
            () => settingsVerify.POST(makeEvent({
                cookies: createCookieJar({'passkey-challenge': authToken}),
                user: alice,
                body: {id: 'new-cred', clientChallenge: 'auth-only-challenge'}
            })),
            {status: 400, message: 'Challenge expired'}
        );
        assert.equal(regVerifyCalls.length, 0);
        assert.equal(challengeStore.has(sha256Hex(authToken)), true, 'Wrong-purpose attempt must not consume row');

        // 2. Registration challenge rejected by authentication verify
        const regCookies = createCookieJar();
        nextGeneratedChallenge = 'reg-only-challenge';
        await settingsOptions.POST(makeEvent({cookies: regCookies, user: alice}));
        const regToken = regCookies.get('passkey-challenge');

        await assert.rejects(
            () => loginVerify.POST(makeEvent({
                cookies: createCookieJar({'passkey-challenge': regToken}),
                body: {id: 'cred-1', clientChallenge: 'reg-only-challenge'}
            })),
            {status: 400, message: 'Challenge expired'}
        );
        assert.equal(authVerifyCalls.length, 0);
        assert.equal(challengeStore.has(sha256Hex(regToken)), true, 'Wrong-purpose attempt must not consume row');
    });

    test('registration challenge created for user A cannot be consumed by user B, and is single-use for user A', async () => {
        const alice = {id: 'alice', username: 'alice'};
        const bob = {id: 'bob', username: 'bob'};

        const cookies = createCookieJar();
        nextGeneratedChallenge = 'alice-reg-challenge';
        await settingsOptions.POST(makeEvent({cookies, user: alice}));
        const token = cookies.get('passkey-challenge');

        const stored = challengeStore.get(sha256Hex(token));
        assert.equal(stored.purpose, 'registration');
        assert.equal(stored.userId, 'alice');

        // User B attempts to consume Alice's registration challenge
        await assert.rejects(
            () => settingsVerify.POST(makeEvent({
                cookies: createCookieJar({'passkey-challenge': token}),
                user: bob,
                body: {id: 'bob-cred', clientChallenge: 'alice-reg-challenge'}
            })),
            {status: 400, message: 'Challenge expired'}
        );
        assert.equal(regVerifyCalls.length, 0);
        assert.equal(createdPasskeys.length, 0);
        assert.equal(challengeStore.has(sha256Hex(token)), true, 'Wrong-user attempt must not consume Alice challenge');

        // User A consumes their own challenge once
        const okRes = await settingsVerify.POST(makeEvent({
            cookies: createCookieJar({'passkey-challenge': token}),
            user: alice,
            body: {id: 'alice-cred', clientChallenge: 'alice-reg-challenge'}
        }));
        assert.deepEqual({...okRes.body}, {success: true});
        assert.equal(regVerifyCalls.length, 1);
        assert.equal(createdPasskeys.length, 1);
        assert.equal(createdPasskeys[0].userId, 'alice');
        assert.equal(challengeStore.size, 0);

        // User A replay with same token fails
        await assert.rejects(
            () => settingsVerify.POST(makeEvent({
                cookies: createCookieJar({'passkey-challenge': token}),
                user: alice,
                body: {id: 'alice-cred-2', clientChallenge: 'alice-reg-challenge'}
            })),
            {status: 400, message: 'Challenge expired'}
        );
        assert.equal(createdPasskeys.length, 1);
    });

    test('createChallenge enforces purpose/userId invariants', async () => {
        await assert.rejects(
            () => webauthn.createChallenge(makeEvent(), 'c1', 'registration'),
            /userId/
        );
        await assert.rejects(
            () => webauthn.createChallenge(makeEvent(), 'c1', 'authentication', 'alice'),
            /userId/
        );
        assert.equal(challengeStore.size, 0);
    });
});
