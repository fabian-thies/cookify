import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
let downloads = 0;
let failDownload = false;
let input = await sharp({create: {width: 2000, height: 1000, channels: 3, background: '#ed9933'}}).png().toBuffer();
const imports = {
    '@sveltejs/kit': {json: (data, options) => Response.json(data, options)},
    '$lib/server/remote-image': {downloadImage: async (url, limit) => {
        downloads++;
        assert.equal(url, 'https://example.com/photo');
        assert.equal(limit, 15 * 1024 * 1024);
        if (failDownload) throw new Error('Download failed');
        return new File([input], 'remote-image');
    }},
    '$lib/server/image': {MAX_IMAGE_SIZE: 15 * 1024 * 1024}
};
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('src/routes/api/recipes/image/+server.ts', 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}
}).outputText, {exports, Buffer, Response, Uint8Array, require: name => imports[name] ?? require(name)});
const post = (body, user = {id: 'owner'}) => exports.POST({
    locals: {user}, request: new Request('https://cookify.example/api/recipes/image', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)
    })
});
assert.equal((await post({url: 'https://example.com/photo'}, null)).status, 401);
for (const url of ['', null, {}, 'x'.repeat(2049)]) assert.equal((await post({url})).status, 400);
assert.equal(downloads, 0, 'Do not download before authorization and input validation');
let response = await post({url: ' https://example.com/photo '});
assert.equal(response.status, 200);
assert.equal(response.headers.get('Content-Type'), 'image/webp');
assert.equal(response.headers.get('Cache-Control'), 'no-store');
const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
assert.equal(metadata.format, 'webp');
assert.equal(metadata.width, 1600);
assert.equal(metadata.height, 800);
input = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>');
assert.equal((await post({url: 'https://example.com/photo'})).status, 400, 'SVG must be rejected');
input = Buffer.from('<html>This is not an image</html>');
assert.equal((await post({url: 'https://example.com/photo'})).status, 400);
failDownload = true;
assert.equal((await post({url: 'https://example.com/photo'})).status, 400);
console.log('Image preview endpoint checks passed');
