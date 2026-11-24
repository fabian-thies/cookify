import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {beforeEach, describe, test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as v from 'valibot';
import {verify as realArgon2Verify} from '@node-rs/argon2';

const require = createRequire(import.meta.url);

function loadModule(filename, imports = {}) {
    const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
        },
    }).outputText;

    const exports = {};
    vm.runInNewContext(
        source,
        {
            exports,
            URL,
            FormData,
            Request,
            Uint8Array,
            Date,
            Map,
            crypto,
            console: {error() {}, log() {}},
            require: (name) => (name in imports ? imports[name] : require(name)),
        },
        {filename}
    );
    return exports;
}

const utils = loadModule('src/lib/utils.ts');
const authRateLimit = loadModule('src/lib/server/auth-rate-limit.ts');

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const SIXTY_MINUTES_MS = 60 * 60 * 1000;

describe('password minimum length validation', () => {
    test('exports MIN_PASSWORD_LENGTH = 10 and LEGACY_MIN_PASSWORD_LENGTH = 6', () => {
        assert.equal(utils.MIN_PASSWORD_LENGTH, 10);
        assert.equal(utils.LEGACY_MIN_PASSWORD_LENGTH, 6);
    });

    test('validatePassword enforces >= 10 and <= 255 characters for new passwords', () => {
        assert.equal(utils.validatePassword('12345'), false);
        assert.equal(utils.validatePassword('123456'), false);
        assert.equal(utils.validatePassword('123456789'), false);
        assert.equal(utils.validatePassword('1234567890'), true);
        assert.equal(utils.validatePassword('a'.repeat(255)), true);
        assert.equal(utils.validatePassword('a'.repeat(256)), false);
        assert.equal(utils.validatePassword(null), false);
        assert.equal(utils.validatePassword(1234567890), false);
    });

    test('validateLoginPassword allows legacy 6-9 char passwords without locking out existing users', () => {
        assert.equal(utils.validateLoginPassword('12345'), false);
        assert.equal(utils.validateLoginPassword('123456'), true);
        assert.equal(utils.validateLoginPassword('123456789'), true);
        assert.equal(utils.validateLoginPassword('1234567890'), true);
        assert.equal(utils.validateLoginPassword('a'.repeat(255)), true);
        assert.equal(utils.validateLoginPassword('a'.repeat(256)), false);
        assert.equal(utils.validateLoginPassword(undefined), false);
    });

    test('user.remote setUserPassword and updateUserPassword enforce MIN_PASSWORD_LENGTH', async () => {
        let currentEvent = {locals: {user: {id: 'admin-1', administrator: true}}};
        const updated = [];
        const userRemote = loadModule('src/lib/functions/user.remote.ts', {
            'valibot': v,
            '$app/server': {
                getRequestEvent: () => currentEvent,
                query: (schemaOrFn, maybeFn) =>
                    typeof schemaOrFn === 'function' ? async () => schemaOrFn() : async (input) => maybeFn(v.parse(schemaOrFn, input)),
                command: (schemaOrFn, maybeFn) =>
                    typeof schemaOrFn === 'function' ? async () => schemaOrFn() : async (input) => maybeFn(v.parse(schemaOrFn, input)),
            },
            '$lib/server/db/user': {
                updatePassword: async (...args) => updated.push(args),
                updateUserEmail: async () => {},
                deleteUserAccount: async () => {},
                getUsers: async () => [],
                getUserById: async () => null,
                getLocaleByUserId: async () => 'en',
                saveProfile: async () => {},
            },
            '$lib/server/utils': {hashPassword: async (pw) => `hashed:${pw}`},
            '$lib/utils': utils,
        });

        await assert.rejects(() => userRemote.setUserPassword({userId: 'u1', password: '123456789'}), v.ValiError);
        await assert.rejects(() => userRemote.updateUserPassword({password: '123456789'}), v.ValiError);
        assert.equal(updated.length, 0);

        await userRemote.setUserPassword({userId: 'u1', password: '1234567890'});
        await userRemote.updateUserPassword({password: '1234567890'});
        assert.equal(updated.length, 2);
    });
});

describe('auth-rate-limit helpers', () => {
    beforeEach(() => {
        authRateLimit.clearAuthRateLimits();
    });

    test('getClientIp returns address and falls back to "unknown" when unavailable or throwing', () => {
        assert.equal(authRateLimit.getClientIp({getClientAddress: () => ' 203.0.113.10 '}), '203.0.113.10');
        assert.equal(authRateLimit.getClientIp({getClientAddress: () => '   '}), 'unknown');
        assert.equal(authRateLimit.getClientIp({
            getClientAddress: () => {
                throw new Error('Cannot determine clientAddress');
            }
        }), 'unknown');
        assert.equal(authRateLimit.getClientIp({}), 'unknown');
    });

    test('checkLoginRateLimit enforces per-username limit (10 / 15m, case-insensitive), reset, and expiry', () => {
        const start = 1_700_000_000_000;

        for (let i = 0; i < 10; i++) {
            const name = i % 2 === 0 ? 'ChefAlice' : 'chefalice';
            assert.equal(authRateLimit.checkLoginRateLimit(`10.0.0.${i + 1}`, name, start + i * 1000), true);
        }

        // 11th attempt for same username from a brand-new IP is blocked
        assert.equal(authRateLimit.checkLoginRateLimit('10.0.1.99', 'CHEFALICE', start + 11_000), false);

        // Resetting username clears only that username bucket
        authRateLimit.resetLoginUserRateLimit('ChefAlice');
        assert.equal(authRateLimit.checkLoginRateLimit('10.0.1.100', 'chefalice', start + 12_000), true);

        // Fill again up to 10 and verify window expiry after 15 minutes
        for (let i = 1; i < 10; i++) {
            assert.equal(authRateLimit.checkLoginRateLimit(`10.0.2.${i}`, 'chefalice', start + 12_000 + i * 1000), true);
        }
        assert.equal(authRateLimit.checkLoginRateLimit('10.0.2.99', 'chefalice', start + 30_000), false);
        assert.equal(
            authRateLimit.checkLoginRateLimit('10.0.2.99', 'chefalice', start + 12_000 + FIFTEEN_MINUTES_MS),
            true
        );
    });

    test('checkLoginRateLimit enforces per-IP limit (20 / 15m) without blocking innocent usernames from other IPs', () => {
        const start = 1_700_000_000_000;

        for (let i = 0; i < 20; i++) {
            assert.equal(authRateLimit.checkLoginRateLimit('198.51.100.5', `user_${i}`, start + i * 100), true);
        }

        // 21st attempt from same IP is blocked even for a brand new username
        assert.equal(authRateLimit.checkLoginRateLimit('198.51.100.5', 'innocent_user', start + 3000), false);

        // Innocent username from a different IP is unaffected
        assert.equal(authRateLimit.checkLoginRateLimit('198.51.100.6', 'innocent_user', start + 3000), true);

        // Window expiry frees the IP
        assert.equal(
            authRateLimit.checkLoginRateLimit('198.51.100.5', 'user_after_window', start + FIFTEEN_MINUTES_MS),
            true
        );
    });

    test('checkRegisterRateLimit enforces 10 / 60m per IP and expires after 60m', () => {
        const start = 1_700_000_000_000;

        for (let i = 0; i < 10; i++) {
            assert.equal(authRateLimit.checkRegisterRateLimit('203.0.113.50', start + i * 1000), true);
        }
        assert.equal(authRateLimit.checkRegisterRateLimit('203.0.113.50', start + 15_000), false);
        assert.equal(authRateLimit.checkRegisterRateLimit('203.0.113.51', start + 15_000), true);
        assert.equal(
            authRateLimit.checkRegisterRateLimit('203.0.113.50', start + SIXTY_MINUTES_MS),
            true
        );
    });

    test('checkPasskeyOptionsRateLimit (30 / 15m) and checkPasskeyVerifyRateLimit (20 / 15m)', () => {
        const start = 1_700_000_000_000;

        for (let i = 0; i < 30; i++) {
            assert.equal(authRateLimit.checkPasskeyOptionsRateLimit('192.0.2.1', start + i * 100), true);
        }
        assert.equal(authRateLimit.checkPasskeyOptionsRateLimit('192.0.2.1', start + 5000), false);
        assert.equal(authRateLimit.checkPasskeyOptionsRateLimit('192.0.2.1', start + FIFTEEN_MINUTES_MS), true);

        for (let i = 0; i < 20; i++) {
            assert.equal(authRateLimit.checkPasskeyVerifyRateLimit('192.0.2.2', start + i * 100), true);
        }
        assert.equal(authRateLimit.checkPasskeyVerifyRateLimit('192.0.2.2', start + 5000), false);
        assert.equal(authRateLimit.checkPasskeyVerifyRateLimit('192.0.2.2', start + FIFTEEN_MINUTES_MS), true);
    });
});

describe('login/register actions and passkey endpoint security', () => {
    const ORIGIN = 'https://cookify.example';

    beforeEach(() => {
        authRateLimit.clearAuthRateLimits();
    });

    function createLoginHarness({users = [], verifyImpl = null} = {}) {
        const dbQueries = [];
        const verifyCalls = [];
        const hashCalls = [];
        const sessionsCreated = [];

        const db = {
            select: () => ({
                from: () => ({
                    where: async () => {
                        dbQueries.push('select-where');
                        return users;
                    },
                    limit: async () => {
                        dbQueries.push('select-limit');
                        return users;
                    },
                }),
            }),
            insert: () => ({
                values: async () => {
                    dbQueries.push('insert');
                },
            }),
        };

        const mod = loadModule('src/routes/(auth)/login/+page.server.ts', {
            '$lib/paraglide/runtime': {getLocale: () => 'en'},
            '@node-rs/argon2': {
                verify: async (hash, password, options) => {
                    verifyCalls.push({hash, password, options: {...options}});
                    if (verifyImpl) {
                        return await verifyImpl(hash, password, options);
                    }
                    return false;
                },
            },
            '@oslojs/encoding': {encodeBase32LowerCase: () => 'generated-user-id'},
            '@sveltejs/kit': {
                fail: (status, data) => ({type: 'failure', status, data: data ? {...data} : data}),
                redirect: (status, location) => ({type: 'redirect', status, location}),
            },
            'drizzle-orm': {eq: () => ({})},
            '$lib/server/auth': {
                generateSessionToken: () => 'token-123',
                createSession: async (token, userId) => {
                    sessionsCreated.push({token, userId});
                    return {id: 'session-1', userId, expiresAt: new Date(Date.now() + 60_000)};
                },
                setSessionTokenCookie: () => {},
            },
            '$lib/server/db': {getDb: () => db},
            '$lib/server/db/schema': {user: {username: 'username'}},
            '$lib/utils': utils,
            '$lib/server/utils': {
                hashPassword: async (pw) => {
                    hashCalls.push(pw);
                    return `hashed:${pw}`;
                },
            },
            '$lib/functions/site.remote': {getAllowRegistrations: async () => true},
            '$lib/server/auth-rate-limit': authRateLimit,
        });

        return {actions: mod.actions, dbQueries, verifyCalls, hashCalls, sessionsCreated};
    }

    function makeFormEvent(fields, ip = '203.0.113.1') {
        const formData = new FormData();
        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) {
                formData.set(key, value);
            }
        }
        return {
            url: new URL(`${ORIGIN}/login`),
            getClientAddress: () => ip,
            request: {formData: async () => formData},
        };
    }

    test('constant-time login: verify() runs against valid Argon2id dummy hash when user does not exist and still fails with 400', async () => {
        // Test with real @node-rs/argon2 verify to ensure DUMMY_PASSWORD_HASH is a genuine, parseable Argon2id hash
        const realHarness = createLoginHarness({
            users: [],
            verifyImpl: (hash, password, options) => realArgon2Verify(hash, password, options),
        });

        const res = await realHarness.actions.login(
            makeFormEvent({username: 'nonexistent_user', password: 'some-password-123'}, '203.0.113.7')
        );

        assert.deepEqual(res, {
            type: 'failure',
            status: 400,
            data: {message: 'Incorrect username or password'},
        });
        assert.equal(realHarness.verifyCalls.length, 1, 'verify() must run even when user does not exist');
        assert.match(realHarness.verifyCalls[0].hash, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
        assert.deepEqual(realHarness.verifyCalls[0].options, {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1,
        });
        assert.equal(realHarness.sessionsCreated.length, 0);

        // Even if verify() hypothetically returned true, missing user must still fail with 400
        const trueHarness = createLoginHarness({
            users: [],
            verifyImpl: async () => true,
        });
        const resTrue = await trueHarness.actions.login(
            makeFormEvent({username: 'still_missing', password: 'any-password-123'}, '203.0.113.8')
        );
        assert.deepEqual(resTrue, {
            type: 'failure',
            status: 400,
            data: {message: 'Incorrect username or password'},
        });
        assert.equal(trueHarness.sessionsCreated.length, 0);
    });

    test('login action enforces rate limit before DB or Argon2 and resets username bucket on success', async () => {
        let shouldVerify = false;
        const harness = createLoginHarness({
            users: [{id: 'u1', username: 'legacyuser', passwordHash: 'stored-hash'}],
            verifyImpl: async () => shouldVerify,
        });

        // 9 failed attempts with a legacy 6-character password
        for (let i = 0; i < 9; i++) {
            const failRes = await harness.actions.login(
                makeFormEvent({username: 'legacyuser', password: 'oldpw6'}, `198.51.100.${i + 1}`)
            );
            assert.equal(failRes.status, 400);
        }

        // 10th attempt succeeds -> resets user rate limit bucket
        shouldVerify = true;
        const okRes = await harness.actions.login(
            makeFormEvent({username: 'legacyuser', password: 'oldpw6'}, '198.51.100.50')
        );
        assert.equal(okRes.type, 'redirect');
        assert.equal(okRes.status, 302);

        // After reset, user is not blocked on subsequent attempts
        shouldVerify = false;
        for (let i = 0; i < 10; i++) {
            const failRes = await harness.actions.login(
                makeFormEvent({username: 'legacyuser', password: 'wrongpw'}, `198.51.101.${i + 1}`)
            );
            assert.equal(failRes.status, 400);
        }

        const queriesBefore = harness.dbQueries.length;
        const verifiesBefore = harness.verifyCalls.length;

        // 11th failed attempt hits 429 BEFORE DB query or Argon2 verify
        const rateLimited = await harness.actions.login(
            makeFormEvent({username: 'legacyuser', password: 'wrongpw'}, '198.51.101.99')
        );
        assert.deepEqual(rateLimited, {
            type: 'failure',
            status: 429,
            data: {message: 'Too many login attempts. Please try again later.'},
        });
        assert.equal(harness.dbQueries.length, queriesBefore, 'Rate-limited login must not query DB');
        assert.equal(harness.verifyCalls.length, verifiesBefore, 'Rate-limited login must not run Argon2');
    });

    test('register action enforces >= 10 char password and per-IP rate limit (429)', async () => {
        const harness = createLoginHarness();

        const shortPwRes = await harness.actions.register(
            makeFormEvent(
                {
                    username: 'newchef1',
                    email: 'newchef1@example.com',
                    password: '123456789',
                    confirmPassword: '123456789',
                },
                '203.0.113.20'
            )
        );
        assert.deepEqual(shortPwRes, {
            type: 'failure',
            status: 400,
            data: {message: 'Invalid password (min 10, max 255 characters)'},
        });
        assert.equal(harness.hashCalls.length, 0);

        // 9 more requests from the same IP exhaust the 10-request window (1 + 9 = 10)
        for (let i = 0; i < 9; i++) {
            const res = await harness.actions.register(
                makeFormEvent(
                    {
                        username: `newchef_${i}`,
                        email: `newchef_${i}@example.com`,
                        password: 'validpassword10',
                        confirmPassword: 'validpassword10',
                    },
                    '203.0.113.20'
                )
            );
            assert.equal(res.type, 'redirect');
        }

        const hashesBefore = harness.hashCalls.length;
        const queriesBefore = harness.dbQueries.length;
        const limited = await harness.actions.register(
            makeFormEvent(
                {
                    username: 'newchef_extra',
                    email: 'extra@example.com',
                    password: 'validpassword10',
                    confirmPassword: 'validpassword10',
                },
                '203.0.113.20'
            )
        );
        assert.deepEqual(limited, {
            type: 'failure',
            status: 429,
            data: {message: 'Too many registration attempts. Please try again later.'},
        });
        assert.equal(harness.hashCalls.length, hashesBefore);
        assert.equal(harness.dbQueries.length, queriesBefore);
    });

    test('passkey options and verify endpoints enforce 429 rate limits before WebAuthn/DB calls', async () => {
        let optionsGenCalls = 0;
        let consumeCalls = 0;

        const kitMock = {
            error: (status, message) => Object.assign(new Error(message), {status}),
            json: (data) => ({status: 200, body: data}),
        };

        const passkeyOptions = loadModule('src/routes/(auth)/login/passkey/options/+server.ts', {
            '@sveltejs/kit': kitMock,
            '@simplewebauthn/server': {
                generateAuthenticationOptions: async () => {
                    optionsGenCalls++;
                    return {challenge: 'c1'};
                },
            },
            '$lib/server/webauthn': {createChallenge: async () => {}},
            '$lib/server/auth-rate-limit': authRateLimit,
        });

        const passkeyVerify = loadModule('src/routes/(auth)/login/passkey/verify/+server.ts', {
            '@sveltejs/kit': kitMock,
            '@simplewebauthn/server': {verifyAuthenticationResponse: async () => ({verified: false})},
            '@simplewebauthn/server/helpers': {isoBase64URL: {toBuffer: () => new Uint8Array()}},
            '$lib/server/auth': {
                generateSessionToken: () => 't',
                createSession: async () => ({}),
                setSessionTokenCookie: () => {},
            },
            '$lib/server/db/passkey': {
                getPasskeyById: async () => null,
                updatePasskeyCounter: async () => {},
            },
            '$lib/server/webauthn': {
                consumeChallenge: async () => {
                    consumeCalls++;
                    return null;
                },
            },
            '$lib/server/auth-rate-limit': authRateLimit,
        });

        const makePasskeyEvent = (ip) => ({
            url: new URL(`${ORIGIN}/login/passkey`),
            getClientAddress: () => ip,
            request: {json: async () => ({})},
        });

        for (let i = 0; i < 30; i++) {
            const res = await passkeyOptions.POST(makePasskeyEvent('203.0.113.80'));
            assert.equal(res.status, 200);
        }
        assert.equal(optionsGenCalls, 30);

        await assert.rejects(
            () => passkeyOptions.POST(makePasskeyEvent('203.0.113.80')),
            {status: 429, message: 'Too many attempts. Please try again later.'}
        );
        assert.equal(optionsGenCalls, 30);

        for (let i = 0; i < 20; i++) {
            await assert.rejects(
                () => passkeyVerify.POST(makePasskeyEvent('203.0.113.81')),
                {status: 400, message: 'Challenge expired'}
            );
        }
        assert.equal(consumeCalls, 20);

        await assert.rejects(
            () => passkeyVerify.POST(makePasskeyEvent('203.0.113.81')),
            {status: 429, message: 'Too many attempts. Please try again later.'}
        );
        assert.equal(consumeCalls, 20);
    });
});
