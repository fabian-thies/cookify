import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {drizzle} from 'drizzle-orm/pg-proxy';

const require = createRequire(import.meta.url);
const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cookify-restore-'));
const localProcess = {cwd: () => cwd};
const backupDir = 'src/routes/(app)/administration/backup';
const kit = {
    error: (status, message) => Object.assign(new Error(message), {status}),
    json: (data) => Response.json(data),
};

function load(filename, imports = {}) {
    const exports = {};
    const {outputText} = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
    });
    vm.runInNewContext(outputText, {
        exports, Buffer, Date, File, Response, console, process: localProcess,
        require: name => imports[name] ?? require(name),
    }, {filename});
    return exports;
}

const timestamp = '2026-01-15T09:30:00.000Z';
const date = '2026-01-15';
const table = load('src/lib/server/db/schema.ts', {
    '../../constants': load('src/lib/constants.ts'),
    '../../shopping-list': load('src/lib/shopping-list.ts'),
});
const archive = load(`${backupDir}/archive.ts`, {'@sveltejs/kit': kit});
const data = new Map([
    [table.user, [{id: 'owner', username: 'owner', email: 'owner@example.test', passwordHash: 'test'}]],
    [table.recipes, [{id: 1, userId: 'owner', title: 'Soup', description: 'Soup', image: '/uploads/cover.png', servings: 2, cookingTime: 10}]],
    [table.cookHistory, [{id: 1, userId: 'owner', recipeId: 1, cookedAt: new Date(timestamp)}]],
    [table.mealPlan, [{id: 1, userId: 'owner', recipeId: 1, date, createdAt: new Date(timestamp)}]],
]);

const proxy = drizzle(async () => ({rows: []}));
const inserts = new Map();
let rejectCommit = false;
let pauseTransaction;
const db = {
    select: () => ({from: target => data.get(target) ?? []}),
    transaction: async callback => {
        await pauseTransaction?.();
        await callback({
            delete: () => Promise.resolve(),
            insert: target => ({values: rows => {
                inserts.set(target, proxy.insert(target).values(rows).toSQL().params);
            }}),
            execute: () => Promise.resolve(),
        });
        if (rejectCommit) throw new Error('Simulated database commit failure');
    },
};
const imports = {
    '@sveltejs/kit': kit,
    '$lib/server/db': {getDb: () => db},
    '$lib/server/db/schema': table,
    '$lib/server/db/recipe': {recipeColumns: {}},
    '../archive': archive,
};
const {GET} = load(`${backupDir}/export/+server.ts`, imports);
const {POST} = load(`${backupDir}/import/+server.ts`, imports);
const locals = {user: {administrator: true}};
const uploads = path.join(cwd, 'uploads');
const restored = path.join(uploads, 'cover.png');
const old = path.join(uploads, 'previous.png');

try {
    fs.mkdirSync(uploads);
    fs.writeFileSync(restored, 'saved photo bytes');
    const rootInode = fs.statSync(uploads).ino;
    const zip = await (await GET({locals})).arrayBuffer();
    fs.renameSync(restored, old);

    function restore() {
        const body = new FormData();
        body.set('file', new File([zip], 'backup.zip'));
        return POST({locals, request: new Request('https://cookify.example/backup', {method: 'POST', body})});
    }

    rejectCommit = true;
    await assert.rejects(restore, {status: 500});
    assert.equal(fs.readFileSync(old, 'utf8'), 'saved photo bytes');
    assert.equal(fs.existsSync(restored), false);

    rejectCommit = false;
    let releaseTransaction;
    let signalTransactionStarted;
    const transactionStarted = new Promise(resolve => {signalTransactionStarted = resolve;});
    pauseTransaction = () => new Promise(resolve => {
        releaseTransaction = resolve;
        signalTransactionStarted();
    });
    const firstRestore = restore();
    await transactionStarted;
    try {
        await assert.rejects(restore, {status: 409});
    } finally {
        releaseTransaction();
    }
    assert.equal((await firstRestore).status, 200);
    assert.deepEqual(inserts.get(table.cookHistory), [1, 'owner', 1, timestamp]);
    assert.deepEqual(inserts.get(table.mealPlan), [1, 'owner', 1, date, timestamp]);
    assert.equal(fs.statSync(uploads).ino, rootInode);
    assert.equal(fs.readFileSync(restored, 'utf8'), 'saved photo bytes');
    assert.deepEqual(fs.readdirSync(uploads), ['cover.png']);
} finally {
    fs.rmSync(cwd, {recursive: true, force: true});
}
