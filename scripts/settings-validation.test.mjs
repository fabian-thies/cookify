import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {beforeEach, describe, test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as v from 'valibot';
import {drizzle} from 'drizzle-orm/pg-proxy';

const require = createRequire(import.meta.url);

function loadModule(path, dependencies = {}) {
    const source = ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
    }).outputText;
    const exports = {};
    vm.runInNewContext(source, {
        exports,
        File,
        FormData,
        URL,
        crypto,
        TextEncoder,
        Uint8Array,
        Date,
        console: {error() {}, log() {}},
        require: name => name in dependencies ? dependencies[name] : require(name)
    }, {filename: path});
    return exports;
}

const constants = loadModule('src/lib/constants.ts');
const languages = loadModule('src/lib/types/languages.ts', {
    '$lib/constants': constants
});
const utils = loadModule('src/lib/utils.ts');

class ImageUploadError extends Error {}

const VALID_CURRENT_PASSWORD = 'current-password-123';
const STORED_PASSWORD_HASH = 'stored-argon2-hash';

let saveImageCalls = [];
let saveProfileCalls = [];
let updatePasswordCalls = [];
let deleteUserAccountCalls = [];
let getUserPasswordHashCalls = [];
let hashPasswordCalls = [];
let verifyPasswordCalls = [];
let createSessionCalls = [];
let setSessionTokenCookieCalls = [];
let invalidateSessionCalls = [];
let deleteSessionTokenCookieCalls = [];
let storedPasswordHash = STORED_PASSWORD_HASH;
let currentEvent = {locals: {user: {id: 'user-1', email: 'user@example.com', avatar: '/uploads/existing.png'}}};

const dbUserMock = {
    saveProfile: async (...args) => {
        saveProfileCalls.push(args);
        return {id: args[0], username: args[1]};
    },
    getUserPasswordHash: async userId => {
        getUserPasswordHashCalls.push(userId);
        return storedPasswordHash;
    },
    updatePassword: async (...args) => {
        updatePasswordCalls.push(args);
    },
    deleteUserAccount: async userId => {
        deleteUserAccountCalls.push(userId);
    },
    updateUserEmail: async () => {},
    getUsers: async () => [],
    getUserById: async () => null,
    getLocaleByUserId: async () => 'en',
};

const serverUtilsMock = {
    hashPassword: async password => {
        hashPasswordCalls.push(password);
        return `hashed:${password}`;
    },
    verifyPassword: async (passwordHash, password) => {
        verifyPasswordCalls.push([passwordHash, password]);
        return passwordHash === STORED_PASSWORD_HASH && password === VALID_CURRENT_PASSWORD;
    }
};

const authMock = {
    generateSessionToken: () => 'rotated-session-token',
    createSession: async (token, userId) => {
        const session = {id: `session-for-${token}`, userId, expiresAt: new Date('2027-01-01T00:00:00Z')};
        createSessionCalls.push({token, userId, session});
        return session;
    },
    setSessionTokenCookie: (event, token, session) => {
        setSessionTokenCookieCalls.push({event, token, session});
    },
    deleteSessionTokenCookie: event => {
        deleteSessionTokenCookieCalls.push(event);
    },
    invalidateSession: async sessionId => {
        invalidateSessionCalls.push(sessionId);
    }
};

const settingsPage = loadModule('src/routes/(app)/settings/+page.server.ts', {
    '@sveltejs/kit': {
        fail: (status, data) => ({status, data}),
        redirect: (status, location) => ({status, location})
    },
    'valibot': v,
    '$lib/constants': constants,
    '$lib/types/languages': languages,
    '$lib/utils': utils,
    '$lib/server/db/user': dbUserMock,
    '$lib/server/utils': serverUtilsMock,
    '$lib/server/image': {
        ImageUploadError,
        saveImage: async file => {
            saveImageCalls.push(file);
            return '/uploads/new-avatar.png';
        }
    },
    '$lib/server/auth': authMock,
    '$lib/server/db/passkey': {
        deletePasskey: async () => {},
        getPasskeysByUserId: async () => []
    }
});

const appServerMock = {
    getRequestEvent: () => currentEvent,
    query: (schemaOrFn, maybeFn) => {
        if (typeof schemaOrFn === 'function') {
            return async () => schemaOrFn();
        }
        return async input => maybeFn(v.parse(schemaOrFn, input));
    },
    command: (schemaOrFn, maybeFn) => {
        if (typeof schemaOrFn === 'function') {
            return async () => schemaOrFn();
        }
        return async input => maybeFn(v.parse(schemaOrFn, input));
    }
};

const userRemote = loadModule('src/lib/functions/user.remote.ts', {
    'valibot': v,
    '$app/server': appServerMock,
    '$lib/server/db/user': dbUserMock,
    '$lib/server/utils': serverUtilsMock,
    '$lib/utils': utils,
});

function createSettingsEvent({
    username = 'valid_user-1',
    email = 'user@example.com',
    userEmail = 'user@example.com',
    language = 'en',
    currentPassword,
    password,
    passwordConfirm,
    avatar
} = {}) {
    const formData = new FormData();
    formData.set('username', username);
    formData.set('email', email);
    formData.set('language', language);
    if (currentPassword !== undefined) formData.set('currentPassword', currentPassword);
    if (password !== undefined) formData.set('password', password);
    if (passwordConfirm !== undefined) formData.set('passwordConfirm', passwordConfirm);
    if (avatar !== undefined) formData.set('avatar', avatar);
    return {
        locals: {
            user: {id: 'user-1', email: userEmail, avatar: '/uploads/existing.png'},
            session: {id: 'old-session-id', userId: 'user-1'}
        },
        request: {formData: async () => formData}
    };
}

function createDeleteEvent({currentPassword, session = {id: 'old-session-id', userId: 'user-1'}} = {}) {
    const formData = new FormData();
    if (currentPassword !== undefined) formData.set('currentPassword', currentPassword);
    return {
        locals: {
            user: {id: 'user-1', email: 'user@example.com', avatar: '/uploads/existing.png'},
            session
        },
        request: {formData: async () => formData}
    };
}

describe('profile settings username, password validation, re-authentication, and session rotation', () => {
    beforeEach(() => {
        saveImageCalls = [];
        saveProfileCalls = [];
        updatePasswordCalls = [];
        deleteUserAccountCalls = [];
        getUserPasswordHashCalls = [];
        hashPasswordCalls = [];
        verifyPasswordCalls = [];
        createSessionCalls = [];
        setSessionTokenCookieCalls = [];
        invalidateSessionCalls = [];
        deleteSessionTokenCookieCalls = [];
        storedPasswordHash = STORED_PASSWORD_HASH;
        currentEvent = {locals: {user: {id: 'user-1', email: 'user@example.com', avatar: '/uploads/existing.png'}}};
    });

    test('user.remote.ts does not export unused saveProfile, updateUserPassword, or deleteOwnAccount commands', () => {
        assert.equal('saveProfile' in userRemote, false, 'user.remote.ts must not export saveProfile');
        assert.equal('updateUserPassword' in userRemote, false, 'user.remote.ts must not export updateUserPassword');
        assert.equal('deleteOwnAccount' in userRemote, false, 'user.remote.ts must not export deleteOwnAccount');
    });

    test('rejects invalid usernames with 400 in settings action without saving avatar or DB', async () => {
        const invalidUsernames = ['', 'ab', 'a'.repeat(32), 'Fabian Müller', 'user name'];

        for (const username of invalidUsernames) {
            const avatar = new File(['avatar-bytes'], 'avatar.png', {type: 'image/png'});
            const result = await settingsPage.actions.save(createSettingsEvent({username, avatar}));

            assert.equal(result.status, 400, `Expected 400 for invalid username ${JSON.stringify(username)}`);
            assert.deepEqual({...result.data}, {invalid: true});
            assert.equal(saveImageCalls.length, 0, 'Avatar must not be saved when username is invalid');
            assert.equal(saveProfileCalls.length, 0, 'DB saveProfile must not be called when username is invalid');
            assert.equal(updatePasswordCalls.length, 0, 'DB updatePassword must not be called when username is invalid');
        }
    });

    test('rejects invalid or mismatched passwords with 400 without touching DB or avatar', async () => {
        const invalidCases = [
            {label: 'too short (5 chars)', password: '12345', passwordConfirm: '12345'},
            {label: 'too short (9 chars)', password: '123456789', passwordConfirm: '123456789'},
            {label: 'too long (256 chars)', password: 'a'.repeat(256), passwordConfirm: 'a'.repeat(256)},
            {label: 'mismatched confirmation', password: 'validpassword', passwordConfirm: 'differentpassword'},
            {label: 'missing confirmation', password: 'validpassword', passwordConfirm: undefined},
            {label: 'empty confirmation', password: 'validpassword', passwordConfirm: ''},
        ];

        for (const {label, password, passwordConfirm} of invalidCases) {
            const avatar = new File(['avatar-bytes'], 'avatar.png', {type: 'image/png'});
            const result = await settingsPage.actions.save(createSettingsEvent({
                password,
                passwordConfirm,
                currentPassword: VALID_CURRENT_PASSWORD,
                avatar
            }));

            assert.equal(result.status, 400, `Expected 400 for password case: ${label}`);
            assert.deepEqual({...result.data}, {invalid: true});
            assert.equal(saveImageCalls.length, 0, `Avatar must not be saved for password case: ${label}`);
            assert.equal(saveProfileCalls.length, 0, `DB saveProfile must not be called for password case: ${label}`);
            assert.equal(hashPasswordCalls.length, 0, `hashPassword must not be called for password case: ${label}`);
            assert.equal(updatePasswordCalls.length, 0, `DB updatePassword must not be called for password case: ${label}`);
        }
    });

    test('rejects changing password without currentPassword with 400 and no avatar or DB writes', async () => {
        for (const currentPassword of [undefined, '']) {
            const avatar = new File(['avatar-bytes'], 'avatar.png', {type: 'image/png'});
            const result = await settingsPage.actions.save(createSettingsEvent({
                password: 'new-valid-password',
                passwordConfirm: 'new-valid-password',
                currentPassword,
                avatar
            }));

            assert.equal(result.status, 400);
            assert.deepEqual({...result.data}, {invalid: true, currentPasswordRequired: true});
            assert.equal(saveImageCalls.length, 0);
            assert.equal(saveProfileCalls.length, 0);
            assert.equal(hashPasswordCalls.length, 0);
            assert.equal(updatePasswordCalls.length, 0);
            assert.equal(createSessionCalls.length, 0);
            assert.equal(setSessionTokenCookieCalls.length, 0);
        }
    });

    test('rejects changing password with wrong currentPassword with 403 and no avatar or DB writes', async () => {
        const avatar = new File(['avatar-bytes'], 'avatar.png', {type: 'image/png'});
        const result = await settingsPage.actions.save(createSettingsEvent({
            password: 'new-valid-password',
            passwordConfirm: 'new-valid-password',
            currentPassword: 'wrong-password',
            avatar
        }));

        assert.equal(result.status, 403);
        assert.deepEqual({...result.data}, {invalid: true, currentPasswordInvalid: true});
        assert.deepEqual(getUserPasswordHashCalls, ['user-1']);
        assert.deepEqual(verifyPasswordCalls, [[STORED_PASSWORD_HASH, 'wrong-password']]);
        assert.equal(saveImageCalls.length, 0);
        assert.equal(saveProfileCalls.length, 0);
        assert.equal(hashPasswordCalls.length, 0);
        assert.equal(updatePasswordCalls.length, 0);
        assert.equal(createSessionCalls.length, 0);
        assert.equal(setSessionTokenCookieCalls.length, 0);
    });

    test('rejects changing email without or with wrong currentPassword (400 / 403) without avatar or DB writes', async () => {
        const avatar1 = new File(['avatar-bytes'], 'avatar.png', {type: 'image/png'});
        const missingRes = await settingsPage.actions.save(createSettingsEvent({
            email: 'new-email@example.com',
            userEmail: 'user@example.com',
            avatar: avatar1
        }));

        assert.equal(missingRes.status, 400);
        assert.deepEqual({...missingRes.data}, {invalid: true, currentPasswordRequired: true});
        assert.equal(saveImageCalls.length, 0);
        assert.equal(saveProfileCalls.length, 0);

        const avatar2 = new File(['avatar-bytes'], 'avatar.png', {type: 'image/png'});
        const wrongRes = await settingsPage.actions.save(createSettingsEvent({
            email: 'new-email@example.com',
            userEmail: 'user@example.com',
            currentPassword: 'wrong-password',
            avatar: avatar2
        }));

        assert.equal(wrongRes.status, 403);
        assert.deepEqual({...wrongRes.data}, {invalid: true, currentPasswordInvalid: true});
        assert.equal(saveImageCalls.length, 0);
        assert.equal(saveProfileCalls.length, 0);

        // With valid currentPassword, email change succeeds without rotating session (no password change)
        const okRes = await settingsPage.actions.save(createSettingsEvent({
            email: 'new-email@example.com',
            userEmail: 'user@example.com',
            currentPassword: VALID_CURRENT_PASSWORD
        }));
        assert.deepEqual({...okRes}, {success: true});
        assert.equal(saveProfileCalls.length, 1);
        assert.equal(saveProfileCalls[0][2], 'new-email@example.com');
        assert.equal(updatePasswordCalls.length, 0);
        assert.equal(createSessionCalls.length, 0);
    });

    test('allows saving username, language, and avatar without changing email or password and without currentPassword', async () => {
        const avatar = new File(['avatar-bytes'], 'avatar.png', {type: 'image/png'});
        const result = await settingsPage.actions.save(createSettingsEvent({
            username: 'Fabian_123-ok',
            email: 'user@example.com',
            userEmail: 'user@example.com',
            language: 'de',
            password: '',
            passwordConfirm: '',
            avatar
        }));

        assert.deepEqual({...result}, {success: true});
        assert.equal(getUserPasswordHashCalls.length, 0);
        assert.equal(verifyPasswordCalls.length, 0);
        assert.equal(saveImageCalls.length, 1);
        assert.equal(saveProfileCalls.length, 1);
        assert.deepEqual(saveProfileCalls[0], [
            'user-1',
            'Fabian_123-ok',
            'user@example.com',
            '/uploads/new-avatar.png',
            'de'
        ]);
        assert.equal(hashPasswordCalls.length, 0);
        assert.equal(updatePasswordCalls.length, 0);
        assert.equal(createSessionCalls.length, 0);
        assert.equal(setSessionTokenCookieCalls.length, 0);
    });

    test('valid password change with valid currentPassword updates password, rotates session, and succeeds', async () => {
        const validPasswords = ['1234567890', 'a'.repeat(255)];

        for (const password of validPasswords) {
            saveImageCalls = [];
            saveProfileCalls = [];
            updatePasswordCalls = [];
            hashPasswordCalls = [];
            getUserPasswordHashCalls = [];
            verifyPasswordCalls = [];
            createSessionCalls = [];
            setSessionTokenCookieCalls = [];

            const avatar = new File(['avatar-bytes'], 'avatar.png', {type: 'image/png'});
            const event = createSettingsEvent({
                username: 'abc',
                email: 'abc@example.com',
                userEmail: 'user@example.com',
                language: 'es',
                currentPassword: VALID_CURRENT_PASSWORD,
                password,
                passwordConfirm: password,
                avatar
            });
            const result = await settingsPage.actions.save(event);

            assert.deepEqual({...result}, {success: true});
            assert.deepEqual(getUserPasswordHashCalls, ['user-1']);
            assert.deepEqual(verifyPasswordCalls, [[STORED_PASSWORD_HASH, VALID_CURRENT_PASSWORD]]);
            assert.equal(saveImageCalls.length, 1);
            assert.equal(saveProfileCalls.length, 1);
            assert.deepEqual(saveProfileCalls[0], [
                'user-1',
                'abc',
                'abc@example.com',
                '/uploads/new-avatar.png',
                'es'
            ]);
            assert.deepEqual(hashPasswordCalls, [password]);
            assert.deepEqual(updatePasswordCalls, [['user-1', `hashed:${password}`]]);
            assert.equal(createSessionCalls.length, 1);
            assert.equal(createSessionCalls[0].token, 'rotated-session-token');
            assert.equal(createSessionCalls[0].userId, 'user-1');
            assert.equal(setSessionTokenCookieCalls.length, 1);
            assert.equal(setSessionTokenCookieCalls[0].event, event);
            assert.equal(setSessionTokenCookieCalls[0].token, 'rotated-session-token');
            assert.deepEqual(setSessionTokenCookieCalls[0].session, createSessionCalls[0].session);
        }
    });

    test('account deletion rejects missing or wrong currentPassword (400 / 403) and succeeds with valid currentPassword', async () => {
        const missingRes = await settingsPage.actions.delete(createDeleteEvent());
        assert.equal(missingRes.status, 400);
        assert.deepEqual({...missingRes.data}, {invalid: true, currentPasswordRequired: true});
        assert.equal(deleteUserAccountCalls.length, 0);
        assert.equal(invalidateSessionCalls.length, 0);
        assert.equal(deleteSessionTokenCookieCalls.length, 0);

        const wrongRes = await settingsPage.actions.delete(createDeleteEvent({currentPassword: 'wrong-password'}));
        assert.equal(wrongRes.status, 403);
        assert.deepEqual({...wrongRes.data}, {invalid: true, currentPasswordInvalid: true});
        assert.equal(deleteUserAccountCalls.length, 0);
        assert.equal(invalidateSessionCalls.length, 0);
        assert.equal(deleteSessionTokenCookieCalls.length, 0);

        const validEvent = createDeleteEvent({currentPassword: VALID_CURRENT_PASSWORD});
        await assert.rejects(
            () => settingsPage.actions.delete(validEvent),
            err => err.status === 303 && err.location === '/login'
        );
        assert.deepEqual(deleteUserAccountCalls, ['user-1']);
        assert.deepEqual(invalidateSessionCalls, ['old-session-id']);
        assert.deepEqual(deleteSessionTokenCookieCalls, [validEvent]);
    });
});

describe('db/user.ts updatePassword and auth.ts invalidateUserSessions', () => {
    const shoppingList = loadModule('src/lib/shopping-list.ts');
    const schema = loadModule('src/lib/server/db/schema.ts', {
        '../../constants': constants,
        '../../shopping-list': shoppingList
    });

    let activeDb;
    const realUserDb = loadModule('src/lib/server/db/user.ts', {
        '$lib/server/db/index': {getDb: () => activeDb},
        '$lib/server/db/schema': schema
    });

    const realAuth = loadModule('src/lib/server/auth.ts', {
        '$lib/server/db': {getDb: () => activeDb},
        '$lib/server/db/schema': schema,
        '$lib/offline-recipes': {OFFLINE_ACCOUNT_COOKIE: 'offline-account'}
    });

    test('updatePassword executes inside a single db.transaction, updating passwordHash and deleting all user sessions', async () => {
        const executed = [];
        let transactionCount = 0;

        const txDb = drizzle(async (sql, params) => {
            executed.push({sql, params});
            return {rows: []};
        });

        activeDb = {
            update() {
                throw new Error('updatePassword must not run update outside transaction');
            },
            delete() {
                throw new Error('updatePassword must not run delete outside transaction');
            },
            transaction: async callback => {
                transactionCount++;
                return callback(txDb);
            }
        };

        await realUserDb.updatePassword('user-42', 'new-hash-value');

        assert.equal(transactionCount, 1);
        assert.equal(executed.length, 2);
        assert.match(executed[0].sql, /^update "user" set "password_hash" = \$1 where "user"\."id" = \$2$/);
        assert.deepEqual(executed[0].params, ['new-hash-value', 'user-42']);
        assert.match(executed[1].sql, /^delete from "session" where "session"\."user_id" = \$1$/);
        assert.deepEqual(executed[1].params, ['user-42']);
    });

    test('admin setUserPassword uses transactional updatePassword and invalidates all target user sessions', async () => {
        const executed = [];
        let transactionCount = 0;

        const txDb = drizzle(async (sql, params) => {
            executed.push({sql, params});
            return {rows: []};
        });

        activeDb = {
            transaction: async callback => {
                transactionCount++;
                return callback(txDb);
            }
        };

        const adminEvent = {locals: {user: {id: 'admin-1', administrator: true}}};
        const adminUserRemote = loadModule('src/lib/functions/user.remote.ts', {
            'valibot': v,
            '$app/server': {
                getRequestEvent: () => adminEvent,
                query: (schemaOrFn, maybeFn) =>
                    typeof schemaOrFn === 'function' ? async () => schemaOrFn() : async input => maybeFn(v.parse(schemaOrFn, input)),
                command: (schemaOrFn, maybeFn) =>
                    typeof schemaOrFn === 'function' ? async () => schemaOrFn() : async input => maybeFn(v.parse(schemaOrFn, input))
            },
            '$lib/server/db/user': realUserDb,
            '$lib/server/utils': {hashPassword: async pw => `hashed:${pw}`},
            '$lib/utils': utils
        });

        await adminUserRemote.setUserPassword({userId: 'target-user', password: 'new-admin-password-10'});

        assert.equal(transactionCount, 1);
        assert.equal(executed.length, 2);
        assert.match(executed[0].sql, /^update "user" set "password_hash" = \$1 where "user"\."id" = \$2$/);
        assert.deepEqual(executed[0].params, ['hashed:new-admin-password-10', 'target-user']);
        assert.match(executed[1].sql, /^delete from "session" where "session"\."user_id" = \$1$/);
        assert.deepEqual(executed[1].params, ['target-user']);
    });

    test('getUserPasswordHash returns stored passwordHash or null when user is missing', async () => {
        activeDb = drizzle(async (sql, params) => {
            if (params[0] === 'user-with-hash') {
                return {rows: [['$argon2id$hash']]};
            }
            return {rows: []};
        });

        assert.equal(await realUserDb.getUserPasswordHash('user-with-hash'), '$argon2id$hash');
        assert.equal(await realUserDb.getUserPasswordHash('missing-user'), null);
    });

    test('invalidateUserSessions deletes all sessions for the given userId', async () => {
        const executed = [];
        activeDb = drizzle(async (sql, params) => {
            executed.push({sql, params});
            return {rows: []};
        });

        await realAuth.invalidateUserSessions('user-99');

        assert.equal(executed.length, 1);
        assert.match(executed[0].sql, /^delete from "session" where "session"\."user_id" = \$1$/);
        assert.deepEqual(executed[0].params, ['user-99']);
    });
});
