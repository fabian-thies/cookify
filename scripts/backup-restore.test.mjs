import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import AdmZip from 'adm-zip';
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
    [table.user, [
        {id: 'owner', username: 'owner', email: 'owner@example.test', passwordHash: 'test'},
        {id: 'member', username: 'member', email: 'member@example.test', passwordHash: 'test'},
    ]],
    [table.recipes, [{id: 1, userId: 'owner', title: 'Soup', description: 'Soup', image: '/uploads/cover.png', servings: 2, cookingTime: 10}]],
    [table.cookHistory, [{id: 1, userId: 'owner', recipeId: 1, cookedAt: new Date(timestamp)}]],
    [table.mealPlan, [{id: 1, userId: 'owner', recipeId: 1, date, createdAt: new Date(timestamp)}]],
    [table.recipeNotes, [{userId: 'owner', recipeId: 1, note: 'Less salt next time'}]],
    [table.shoppingListShares, [{ownerId: 'owner', memberId: 'member'}]],
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
    assert.deepEqual(inserts.get(table.recipeNotes), ['owner', 1, 'Less salt next time']);
    assert.deepEqual(inserts.get(table.shoppingListShares), ['owner', 'member']);
    assert.equal(fs.statSync(uploads).ino, rootInode);
    assert.equal(fs.readFileSync(restored, 'utf8'), 'saved photo bytes');
    assert.deepEqual(fs.readdirSync(uploads), ['cover.png']);

    const minimalDataJson = Buffer.from(JSON.stringify({users: [], recipes: [], ingredients: [], steps: []}));
    function readBackupBuffer(zipBuffer) {
        const body = new FormData();
        body.set('file', new File([zipBuffer], 'backup.zip'));
        return archive.readBackup(new Request('https://cookify.example/backup', {method: 'POST', body}));
    }

    function replaceAllBytes(buffer, from, to) {
        const copy = Buffer.from(buffer);
        const needle = Buffer.from(from, 'utf8');
        const replacement = Buffer.from(to, 'utf8');
        assert.equal(needle.length, replacement.length);
        let index = 0;
        while ((index = copy.indexOf(needle, index)) !== -1) {
            replacement.copy(copy, index);
            index += replacement.length;
        }
        return copy;
    }

    // Oversized data.json rejected with 400
    {
        const oversizedDataZip = new AdmZip();
        oversizedDataZip.addFile('data.json', Buffer.alloc(archive.MAX_DATA_JSON_BYTES + 1, 0x20));
        await assert.rejects(() => readBackupBuffer(oversizedDataZip.toBuffer()), {status: 400});
    }

    // Oversized upload entry rejected with 400
    {
        const oversizedUploadZip = new AdmZip();
        oversizedUploadZip.addFile('data.json', minimalDataJson);
        oversizedUploadZip.addFile('uploads/huge.png', Buffer.alloc(archive.MAX_UPLOAD_ENTRY_BYTES + 1, 0x00));
        await assert.rejects(() => readBackupBuffer(oversizedUploadZip.toBuffer()), {status: 400});
    }

    // Excessive entry count (> MAX_ARCHIVE_ENTRIES) rejected with 400
    {
        const manyEntriesZip = new AdmZip();
        manyEntriesZip.addFile('data.json', minimalDataJson);
        for (let i = 0; i < archive.MAX_ARCHIVE_ENTRIES; i++) {
            manyEntriesZip.addFile(`uploads/f${i}.png`, Buffer.alloc(0));
        }
        await assert.rejects(() => readBackupBuffer(manyEntriesZip.toBuffer()), {status: 400});
    }

    // Duplicate upload entries (exact & case-colliding) rejected with 400
    {
        const caseCollidingZip = new AdmZip();
        caseCollidingZip.addFile('data.json', minimalDataJson);
        caseCollidingZip.addFile('uploads/Photo.png', Buffer.from('a'));
        caseCollidingZip.addFile('uploads/photo.png', Buffer.from('b'));
        await assert.rejects(() => readBackupBuffer(caseCollidingZip.toBuffer()), {status: 400});

        const exactDuplicateZip = new AdmZip();
        exactDuplicateZip.addFile('data.json', minimalDataJson);
        exactDuplicateZip.addFile('uploads/dup1.png', Buffer.from('a'));
        exactDuplicateZip.addFile('uploads/dup2.png', Buffer.from('b'));
        const exactDuplicateBuffer = replaceAllBytes(exactDuplicateZip.toBuffer(), 'uploads/dup2.png', 'uploads/dup1.png');
        await assert.rejects(() => readBackupBuffer(exactDuplicateBuffer), {status: 400});
    }

    // Duplicate data.json rejected with 400
    {
        const dupDataZip = new AdmZip();
        dupDataZip.addFile('data.json', minimalDataJson);
        dupDataZip.addFile('datb.json', minimalDataJson);
        const dupDataBuffer = replaceAllBytes(dupDataZip.toBuffer(), 'datb.json', 'data.json');
        await assert.rejects(() => readBackupBuffer(dupDataBuffer), {status: 400});
    }
} finally {
    fs.rmSync(cwd, {recursive: true, force: true});
}
