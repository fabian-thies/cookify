import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
let responses = [];
let requests = 0;
let addresses = [{address: '93.184.216.34', family: 4}];
function request(url, options, callback) {
    requests++;
    assert.equal(options.family, addresses[0].family);
    options.lookup(url.hostname, {}, (error, address, family) => {
        assert.equal(error, null);
        assert.equal(address, addresses[0].address, 'Connection must use the validated DNS result');
        assert.equal(family, addresses[0].family);
    });
    const req = new EventEmitter();
    req.end = () => {
        const {status = 200, headers = {}, chunks = ['image bytes']} = responses.shift() ?? {};
        const res = Readable.from(chunks.map(chunk => Buffer.from(chunk)));
        res.statusCode = status;
        res.headers = headers;
        callback(res);
    };
    return req;
}
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/server/remote-image.ts', 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
}).outputText, {
    exports, Buffer, File, URL, AbortSignal,
    require: name => name === 'node:dns/promises' ? {lookup: async () => addresses}
        : ['node:http', 'node:https'].includes(name) ? {request} : require(name)
});
const {downloadImage, isPublicAddress} = exports;
for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.2', '192.168.1.1', '169.254.1.1',
    '100.100.100.200', '0.0.0.0', '224.0.0.1', '::1', '::', 'fc00::1', 'fe80::1',
    '::ffff:127.0.0.1', '2002:7f00:1::', '2001::1']) assert.equal(isPublicAddress(address), false, address);
for (const address of ['93.184.216.34', '8.8.8.8', '2606:4700:4700::1111']) {
    assert.equal(isPublicAddress(address), true, address);
}
let file = await downloadImage('https://images.example/photo', 100);
assert.equal(await file.text(), 'image bytes');
for (const url of ['file:///etc/passwd', 'http://127.1/', 'http://[::1]/',
    'http://user:password@images.example/', 'https://images.example:8080/']) {
    const before = requests;
    await assert.rejects(() => downloadImage(url, 100));
    assert.equal(requests, before, 'Unsafe URLs must be rejected before connecting');
}
responses = [{status: 302, headers: {location: 'http://169.254.169.254/latest/meta-data/'}}];
const beforeRedirect = requests;
await assert.rejects(() => downloadImage('https://images.example/redirect', 100));
assert.equal(requests, beforeRedirect + 1, 'Redirect targets must also be checked');
responses = [{status: 302, headers: {location: '/photo'}}, {chunks: ['valid']}];
assert.equal(await (await downloadImage('https://images.example/redirect', 100)).text(), 'valid');
responses = [{headers: {'content-length': '101'}}];
await assert.rejects(() => downloadImage('https://images.example/large', 100));
responses = [{chunks: ['123456', '789012']}];
await assert.rejects(() => downloadImage('https://images.example/large', 10));
responses = [{status: 404}];
await assert.rejects(() => downloadImage('https://images.example/missing', 100));
responses = Array.from({length: 4}, () => ({status: 302, headers: {location: '/loop'}}));
await assert.rejects(() => downloadImage('https://images.example/loop', 100));
addresses = [{address: '10.0.0.2', family: 4}];
const beforePrivateDns = requests;
await assert.rejects(() => downloadImage('https://images.example/private', 100));
assert.equal(requests, beforePrivateDns);
console.log('Remote image download checks passed');

// Exercise both form actions: URL-only recipes, unchanged edits, authorization and cleanup.
let savedUrl;
let writtenImage;
let writtenSource;
let cleanedImage;
let downloadFails = false;
class ImageUploadError extends Error {}
const imageImports = {
    ImageUploadError,
    saveImage: async () => '/uploads/file.jpg',
    saveImageFromUrl: async url => {
        savedUrl = url;
        if (downloadFails) throw new ImageUploadError();
        return '/uploads/downloaded.jpg';
    },
    deleteImage: async image => {cleanedImage = image;}
};
let dbFails = false;
const imports = {
    '@sveltejs/kit': {fail: (status, data) => ({status, data})},
    '$lib/server/image': imageImports,
    '$lib/server/db/recipe': {
        getRecipeById: async () => ({id: 1, userId: 'owner', image: '/uploads/existing.jpg'}),
        createRecipe: async data => {
            if (dbFails) throw new Error('Database failure');
            writtenImage = data.image;
            writtenSource = data.sourceUrl;
            return [{id: 1}];
        },
        updateRecipe: async data => {
            writtenImage = data.image;
            writtenSource = data.sourceUrl;
        }
    }
};
function loadModule(path, dependencies = imports) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
    }).outputText, {exports, File, URL, console: {error() {}, log() {}}, require: name => dependencies[name] ?? require(name)});
    return exports;
}
imports['$lib/server/utils'] = loadModule('src/lib/server/utils.ts', {
    '../recipe-source': loadModule('src/lib/recipe-source.ts')
});
const create = loadModule('src/routes/(app)/recipe/create/+page.server.ts').actions.createRecipe;
const edit = loadModule('src/routes/(app)/recipe/[recipeId=integer]/edit/+page.server.ts').actions.updateRecipe;
function event(url, owner = 'owner', source) {
    const data = new FormData();
    data.set('title', 'Test');
    data.set('description', 'Test recipe');
    data.set('cookTime', '5');
    data.set('servings', '2');
    data.set('difficulty', 'easy');
    if (url) data.set('pictureUrl', url);
    if (source !== undefined) data.set('sourceUrl', source);
    return {locals: {user: owner ? {id: owner} : null}, params: {recipeId: '1'}, request: {formData: async () => data}};
}
assert.equal((await create(event('https://images.example/photo'))).success, true);
assert.equal(savedUrl, 'https://images.example/photo');
assert.equal(writtenImage, '/uploads/downloaded.jpg');
assert.equal((await create(event(null, 'owner', ' https://Example.COM/recipe '))).success, true);
assert.equal(writtenImage, '');
assert.equal(writtenSource, 'https://example.com/recipe');
assert.equal(savedUrl, 'https://images.example/photo', 'The source URL must never be used to fetch a cover');
assert.equal((await edit(event())).success, true);
assert.equal(writtenImage, undefined, 'The stored photo must be left untouched on an unrelated edit');
assert.equal(writtenSource, undefined, 'An edit from an older form must leave the source alone');
assert.equal((await edit(event(null, 'owner', ''))).success, true);
assert.equal(writtenSource, null, 'Clearing the source field must remove the source');
for (const invalid of ['ftp://example.com/recipe', 'https://user:password@example.com/recipe', 'example.com', new File(['wrong field'], 'test.txt')]) {
    assert.equal((await create(event(null, 'owner', invalid))).data.sourceUrlInvalid, true);
    assert.equal((await edit(event(null, 'owner', invalid))).data.sourceUrlInvalid, true);
}
assert.equal((await edit(event('https://images.example/photo'))).success, true);
assert.equal(writtenImage, '/uploads/downloaded.jpg');
assert.equal((await edit(event('https://images.example/photo', 'other'))).status, 403);
assert.equal((await create(event('https://images.example/photo', null))).status, 401);
downloadFails = true;
assert.equal((await create(event('https://images.example/photo'))).data.imageInvalid, true);
assert.equal((await edit(event('https://images.example/photo'))).data.imageInvalid, true);
downloadFails = false;
dbFails = true;
assert.equal((await create(event('https://images.example/photo'))).status, 500);
assert.equal(cleanedImage, '/uploads/downloaded.jpg');
console.log('Recipe image URL action checks passed');
