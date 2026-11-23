import assert from 'node:assert/strict';
import {promises as fs, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {after, before, beforeEach, describe, test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as v from 'valibot';
import {drizzle} from 'drizzle-orm/pg-proxy';

const require = createRequire(import.meta.url);

function loadModule(filePath, dependencies = {}, extraGlobals = {}) {
    const source = ts.transpileModule(readFileSync(filePath, 'utf8'), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true
        }
    }).outputText;
    const exports = {};
    vm.runInNewContext(source, {
        exports,
        Buffer,
        File,
        FormData,
        Response,
        URL,
        process,
        console: {error() {}, log() {}},
        require: name => name in dependencies ? dependencies[name] : require(name),
        ...extraGlobals
    }, {filename: filePath});
    return exports;
}

describe('settings/+page.server.ts load guard', () => {
    const constants = loadModule('src/lib/constants.ts');
    const languages = loadModule('src/lib/types/languages.ts', {'$lib/constants': constants});
    const utils = loadModule('src/lib/utils.ts');

    let passkeyCalls = [];
    let callOrder = [];
    let mockPasskeys = [{id: 'pk-1', createdAt: new Date('2026-01-01T00:00:00Z')}];

    const settingsPage = loadModule('src/routes/(app)/settings/+page.server.ts', {
        '@sveltejs/kit': {
            fail: (status, data) => ({status, data}),
            redirect: (status, location) => ({status, location})
        },
        'valibot': v,
        '$lib/constants': constants,
        '$lib/types/languages': languages,
        '$lib/utils': utils,
        '$lib/server/db/user': {
            saveProfile: async () => {},
            updatePassword: async () => {},
            deleteUserAccount: async () => {}
        },
        '$lib/server/utils': {hashPassword: async () => 'hashed'},
        '$lib/server/image': {
            ImageUploadError: class extends Error {},
            saveImage: async () => '/uploads/avatar.png'
        },
        '$lib/server/auth': {
            deleteSessionTokenCookie: () => {},
            invalidateSession: async () => {}
        },
        '$lib/server/db/passkey': {
            deletePasskey: async () => {},
            getPasskeysByUserId: async userId => {
                callOrder.push('getPasskeysByUserId');
                passkeyCalls.push(userId);
                return mockPasskeys;
            }
        }
    });

    beforeEach(() => {
        passkeyCalls = [];
        callOrder = [];
    });

    test('awaits parent() and returns empty passkeys when locals.user is null without querying DB', async () => {
        let parentAwaited = false;
        const result = await settingsPage.load({
            locals: {user: null},
            parent: async () => {
                callOrder.push('parent:start');
                await Promise.resolve();
                parentAwaited = true;
                callOrder.push('parent:end');
                return {};
            }
        });

        assert.equal(parentAwaited, true);
        assert.deepEqual(callOrder, ['parent:start', 'parent:end']);
        assert.deepEqual(passkeyCalls, []);
        assert.deepEqual({...result, passkeys: [...result.passkeys]}, {passkeys: []});
    });

    test('awaits parent() before loading passkeys when locals.user is present', async () => {
        const result = await settingsPage.load({
            locals: {user: {id: 'user-42'}},
            parent: async () => {
                callOrder.push('parent:start');
                await Promise.resolve();
                callOrder.push('parent:end');
                return {};
            }
        });

        assert.deepEqual(callOrder, ['parent:start', 'parent:end', 'getPasskeysByUserId']);
        assert.deepEqual(passkeyCalls, ['user-42']);
        assert.deepEqual({...result, passkeys: [...result.passkeys]}, {passkeys: mockPasskeys});
    });
});

describe('uploads serving and resolveImageVariant', () => {
    const imagesLib = loadModule('src/lib/images.ts');
    const pngBytes = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82
    ]);

    let tempRoot;
    let uploadDir;
    let imageModule;
    let uploadsRoute;
    let resolveVariantCalls = [];

    before(async () => {
        tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cookify-uploads-test-'));
        uploadDir = path.join(tempRoot, 'uploads');
        await fs.mkdir(path.join(uploadDir, 'subdir'), {recursive: true});
        await fs.mkdir(path.join(uploadDir, 'sample-thumb.webp'), {recursive: true});
        await fs.writeFile(path.join(uploadDir, 'sample.png'), pngBytes);

        imageModule = loadModule(
            'src/lib/server/image.ts',
            {
                './remote-image': {downloadImage: async () => { throw new Error('unused'); }},
                'heic-convert': async () => new ArrayBuffer(0),
                '$lib/images': imagesLib
            },
            {
                process: {...process, cwd: () => tempRoot}
            }
        );

        uploadsRoute = loadModule('src/routes/uploads/[...path]/+server.ts', {
            '@sveltejs/kit': {
                error: (status, message) => Object.assign(new Error(message), {status})
            },
            '$lib/server/image': {
                ...imageModule,
                resolveImageVariant: async requestedPath => {
                    resolveVariantCalls.push(requestedPath);
                    return imageModule.resolveImageVariant(requestedPath);
                }
            }
        });
    });

    beforeEach(() => {
        resolveVariantCalls = [];
    });

    after(async () => {
        if (tempRoot) {
            await fs.rm(tempRoot, {recursive: true, force: true});
        }
    });

    test('returns 404 for a directory inside uploads/ without invoking resolveImageVariant', async () => {
        await assert.rejects(
            () => uploadsRoute.GET({params: {path: 'subdir'}}),
            err => err.status === 404
        );
        assert.deepEqual(resolveVariantCalls, []);

        // Even when the directory name matches a variant pattern for a root image, it must 404 directly.
        await assert.rejects(
            () => uploadsRoute.GET({params: {path: 'sample-thumb.webp'}}),
            err => err.status === 404
        );
        assert.deepEqual(resolveVariantCalls, []);
    });

    test('resolveImageVariant returns null for non-root paths and GET returns 404 for nested variant path', async () => {
        const nestedPath = path.join(uploadDir, 'subdir', 'sample-thumb.webp');
        const outsidePath = path.join(tempRoot, 'sample-thumb.webp');

        assert.equal(await imageModule.resolveImageVariant(nestedPath), null);
        assert.equal(await imageModule.resolveImageVariant(outsidePath), null);

        await assert.rejects(
            () => uploadsRoute.GET({params: {path: 'subdir/sample-thumb.webp'}}),
            err => err.status === 404
        );
        assert.deepEqual(resolveVariantCalls, [nestedPath]);

        // Ensure no variant was written in subdir or root.
        await assert.rejects(() => fs.stat(nestedPath), err => err.code === 'ENOENT');
        await assert.rejects(() => fs.stat(path.join(uploadDir, 'sample-medium.webp')), err => err.code === 'ENOENT');
    });

    test('serves regular files with status 200 and expected headers and body', async () => {
        const response = await uploadsRoute.GET({params: {path: 'sample.png'}});
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Content-Type'), 'image/png');
        assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
        assert.equal(response.headers.get('Content-Security-Policy'), "default-src 'none'; sandbox");

        const body = Buffer.from(await response.arrayBuffer());
        assert.deepEqual(body, pngBytes);
    });
});

describe('deleteUserAccount transactionality', () => {
    const constants = loadModule('src/lib/constants.ts');
    const shoppingList = loadModule('src/lib/shopping-list.ts');
    const schema = loadModule('src/lib/server/db/schema.ts', {
        '../../constants': constants,
        '../../shopping-list': shoppingList
    });

    let activeDb;
    const userDb = loadModule('src/lib/server/db/user.ts', {
        '$lib/server/db/index': {getDb: () => activeDb},
        '$lib/server/db/schema': schema
    });

    test('executes all selects and deletions inside a single db.transaction', async () => {
        const executed = [];
        let transactionCount = 0;

        const txDb = drizzle(async (sql, params) => {
            executed.push({sql, params});
            if (sql.startsWith('select "id" from "recipes"')) {
                return {rows: [[10], [20]]};
            }
            if (sql.startsWith('select "id" from "collections"')) {
                return {rows: [[100]]};
            }
            return {rows: []};
        });

        activeDb = {
            select() {
                throw new Error('deleteUserAccount must not run select outside transaction');
            },
            delete() {
                throw new Error('deleteUserAccount must not run delete outside transaction');
            },
            transaction: async callback => {
                transactionCount++;
                return callback(txDb);
            }
        };

        await userDb.deleteUserAccount('user-1');

        assert.equal(transactionCount, 1);

        const deleteSqls = executed
            .filter(entry => entry.sql.startsWith('delete from '))
            .map(entry => entry.sql);

        const expectedRecipeChildTables = [
            '"meal_plan"',
            '"favorite"',
            '"recipe_rating"',
            '"cook_history"',
            '"collection_to_recipe"',
            '"difficulty_to_recipe"',
            '"ingredients"',
            '"steps"',
            '"tags"',
            '"tips"',
            '"recipes"'
        ];
        for (const table of expectedRecipeChildTables) {
            assert.ok(
                deleteSqls.some(sql => sql.startsWith(`delete from ${table} where `) && sql.includes(' in ')),
                `Expected batch delete on ${table} for user recipes`
            );
        }

        assert.ok(
            deleteSqls.some(sql => sql.startsWith('delete from "collection_to_recipe" where "collection_to_recipe"."collection_id" in ')),
            'Expected collection_to_recipe delete for user collections'
        );
        assert.ok(
            deleteSqls.some(sql => sql.startsWith('delete from "collections" where "collections"."id" in ')),
            'Expected collections delete for user collections'
        );

        const expectedUserTables = [
            '"recipe_rating"',
            '"cook_history"',
            '"favorite"',
            '"passkey"',
            '"meal_plan"',
            '"shopping_list_items"',
            '"session"'
        ];
        for (const table of expectedUserTables) {
            assert.ok(
                deleteSqls.some(sql => sql.startsWith(`delete from ${table} where ${table}."user_id" = `)),
                `Expected user-owned delete on ${table}`
            );
        }

        assert.match(deleteSqls.at(-1), /^delete from "user" where "user"\."id" = \$1$/);
    });

    test('skips recipe and collection batch deletes when user has none', async () => {
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

        await userDb.deleteUserAccount('empty-user');

        assert.equal(transactionCount, 1);
        assert.equal(
            executed.some(entry => entry.sql.startsWith('delete from "recipes"')),
            false,
            'Should not issue recipes delete when user has no recipes'
        );
        assert.equal(
            executed.some(entry => entry.sql.startsWith('delete from "collections"')),
            false,
            'Should not issue collections delete when user has no collections'
        );
        assert.match(executed.at(-1).sql, /^delete from "user" where "user"\."id" = \$1$/);
    });

    test('rolls back and rejects on mid-transaction failure without deleting user row', async () => {
        const executed = [];
        let rollbacks = 0;

        const txDb = drizzle(async (sql, params) => {
            executed.push({sql, params});
            if (sql.startsWith('select "id" from "recipes"')) {
                return {rows: [[10]]};
            }
            if (sql.startsWith('delete from "ingredients"')) {
                throw new Error('simulated delete failure');
            }
            return {rows: []};
        });

        activeDb = {
            transaction: async callback => {
                try {
                    return await callback(txDb);
                } catch (err) {
                    rollbacks++;
                    throw err;
                }
            }
        };

        await assert.rejects(
            () => userDb.deleteUserAccount('user-fail'),
            err => /simulated delete failure/.test(err.cause?.message ?? err.message)
        );

        assert.equal(rollbacks, 1);
        assert.equal(
            executed.some(entry => entry.sql.startsWith('delete from "user"')),
            false,
            'User row delete must not execute after a mid-transaction error'
        );
    });
});
