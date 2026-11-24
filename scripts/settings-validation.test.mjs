import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {beforeEach, describe, test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as v from 'valibot';

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

let saveImageCalls = [];
let saveProfileCalls = [];
let updatePasswordCalls = [];
let hashPasswordCalls = [];
let currentEvent = {locals: {user: {id: 'user-1', avatar: '/uploads/existing.png'}}};

const dbUserMock = {
    saveProfile: async (...args) => {
        saveProfileCalls.push(args);
        return {id: args[0], username: args[1]};
    },
    updatePassword: async (...args) => {
        updatePasswordCalls.push(args);
    },
    deleteUserAccount: async () => {},
    updateUserEmail: async () => {},
    getUsers: async () => [],
    getUserById: async () => null,
    getLocaleByUserId: async () => 'en',
};

const serverUtilsMock = {
    hashPassword: async password => {
        hashPasswordCalls.push(password);
        return `hashed:${password}`;
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
    '$lib/server/auth': {
        deleteSessionTokenCookie: () => {},
        invalidateSession: async () => {}
    },
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
    language = 'en',
    password,
    passwordConfirm,
    avatar
} = {}) {
    const formData = new FormData();
    formData.set('username', username);
    formData.set('email', email);
    formData.set('language', language);
    if (password !== undefined) formData.set('password', password);
    if (passwordConfirm !== undefined) formData.set('passwordConfirm', passwordConfirm);
    if (avatar !== undefined) formData.set('avatar', avatar);
    return {
        locals: {user: {id: 'user-1', avatar: '/uploads/existing.png'}},
        request: {formData: async () => formData}
    };
}

describe('profile settings username and password validation', () => {
    beforeEach(() => {
        saveImageCalls = [];
        saveProfileCalls = [];
        updatePasswordCalls = [];
        hashPasswordCalls = [];
        currentEvent = {locals: {user: {id: 'user-1', avatar: '/uploads/existing.png'}}};
    });

    test('rejects invalid usernames with 400 in settings action without saving avatar or DB and in remote saveProfile', async () => {
        const invalidUsernames = ['', 'ab', 'a'.repeat(32), 'Fabian Müller', 'user name'];

        for (const username of invalidUsernames) {
            const avatar = new File(['avatar-bytes'], 'avatar.png', {type: 'image/png'});
            const result = await settingsPage.actions.save(createSettingsEvent({username, avatar}));

            assert.equal(result.status, 400, `Expected 400 for invalid username ${JSON.stringify(username)}`);
            assert.deepEqual({...result.data}, {invalid: true});
            assert.equal(saveImageCalls.length, 0, 'Avatar must not be saved when username is invalid');
            assert.equal(saveProfileCalls.length, 0, 'DB saveProfile must not be called when username is invalid');
            assert.equal(updatePasswordCalls.length, 0, 'DB updatePassword must not be called when username is invalid');

            await assert.rejects(
                () => userRemote.saveProfile({
                    username,
                    email: 'user@example.com',
                    avatar: '/uploads/existing.png',
                    language: 'en'
                }),
                v.ValiError,
                `Expected remote saveProfile to reject invalid username ${JSON.stringify(username)}`
            );
            assert.equal(saveProfileCalls.length, 0, 'Remote saveProfile must not call DB when username is invalid');
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

    test('allows valid profile save without password and does not call updatePassword', async () => {
        const result = await settingsPage.actions.save(createSettingsEvent({
            username: 'Fabian_123-ok',
            email: 'fabian@example.com',
            language: 'de',
            password: '',
            passwordConfirm: ''
        }));

        assert.deepEqual({...result}, {success: true});
        assert.equal(saveProfileCalls.length, 1);
        assert.deepEqual(saveProfileCalls[0], [
            'user-1',
            'Fabian_123-ok',
            'fabian@example.com',
            '/uploads/existing.png',
            'de'
        ]);
        assert.equal(hashPasswordCalls.length, 0);
        assert.equal(updatePasswordCalls.length, 0);

        // Remote saveProfile also accepts valid usernames
        await userRemote.saveProfile({
            username: 'a'.repeat(31),
            email: 'fabian@example.com',
            avatar: '/uploads/existing.png',
            language: 'en'
        });
        assert.equal(saveProfileCalls.length, 2);
    });

    test('allows valid profile save with valid matching password and calls both saveProfile and updatePassword', async () => {
        const validPasswords = ['1234567890', 'a'.repeat(255)];

        for (const password of validPasswords) {
            saveImageCalls = [];
            saveProfileCalls = [];
            updatePasswordCalls = [];
            hashPasswordCalls = [];

            const avatar = new File(['avatar-bytes'], 'avatar.png', {type: 'image/png'});
            const result = await settingsPage.actions.save(createSettingsEvent({
                username: 'abc',
                email: 'abc@example.com',
                language: 'es',
                password,
                passwordConfirm: password,
                avatar
            }));

            assert.deepEqual({...result}, {success: true});
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
        }
    });
});
