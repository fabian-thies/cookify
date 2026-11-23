import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {beforeEach, describe, test} from 'node:test';
import vm from 'node:vm';
import {brotliCompressSync, deflateSync, gzipSync} from 'node:zlib';
import ts from 'typescript';

const require = createRequire(import.meta.url);

const SAMPLE_RECIPE_HTML = `<!doctype html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Tomato Pasta",
  "description": "Simple weeknight pasta",
  "recipeIngredient": ["200 g pasta", "2 tomatoes"],
  "recipeInstructions": [{"@type": "HowToStep", "text": "Boil pasta and toss with tomatoes."}]
}
</script>
</head>
<body><h1>Tomato Pasta</h1></body>
</html>`;

let dnsMap = new Map();
let dnsLookups = [];
let queuedResponses = [];
let recordedRequests = [];

function resetMocks() {
    dnsMap = new Map([
        ['dualstack.example', [
            {address: '2606:4700:4700::1111', family: 6},
            {address: '93.184.216.34', family: 4},
        ]],
        ['ipv4first.example', [
            {address: '93.184.216.34', family: 4},
            {address: '2606:4700:4700::1111', family: 6},
        ]],
        ['ipv6only.example', [
            {address: '2606:4700:4700::1111', family: 6},
        ]],
        ['public.example', [
            {address: '93.184.216.34', family: 4},
        ]],
        ['mixed.example', [
            {address: '93.184.216.34', family: 4},
            {address: '127.0.0.1', family: 4},
        ]],
        ['mixed-v6.example', [
            {address: '2606:4700:4700::1111', family: 6},
            {address: 'fe80::1', family: 6},
        ]],
        ['empty.example', []],
        ['internal.example', [
            {address: '10.0.0.42', family: 4},
        ]],
        ['rebinding.example', [
            {address: '93.184.216.34', family: 4},
        ]],
    ]);
    dnsLookups = [];
    queuedResponses = [];
    recordedRequests = [];
}

function mockRequest(url, options, callback) {
    let pinnedSingle = null;
    let pinnedAll = null;
    options.lookup(url.hostname, {}, (err, address, family) => {
        assert.equal(err, null);
        pinnedSingle = {address, family};
    });
    options.lookup(url.hostname, {all: true}, (err, entries) => {
        assert.equal(err, null);
        pinnedAll = Array.from(entries, ({address, family}) => ({address, family}));
    });
    recordedRequests.push({
        url: url.href,
        family: options.family,
        headers: options.headers,
        pinnedSingle,
        pinnedAll,
    });

    const req = new EventEmitter();
    req.end = () => {
        const next = queuedResponses.shift() ?? {status: 200, headers: {}, chunks: [SAMPLE_RECIPE_HTML]};
        const buffers = (next.chunks ?? []).map((chunk) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        const res = Readable.from(buffers);
        res.statusCode = next.status ?? 200;
        res.statusMessage = next.statusMessage ?? (res.statusCode === 200 ? 'OK' : 'Error');
        res.headers = next.headers ?? {};
        callback(res);
    };
    return req;
}

function loadModule(path, imports = {}) {
    const exports = {};
    const transpiled = ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
    }).outputText;
    vm.runInNewContext(transpiled, {
        exports,
        Buffer,
        File,
        URL,
        AbortSignal,
        console: {error() {}, log() {}},
        require: (name) => (name in imports ? imports[name] : require(name)),
    }, {filename: path});
    return exports;
}

const remoteImage = loadModule('src/lib/server/remote-image.ts', {
    'node:dns/promises': {
        lookup: async (hostname, opts) => {
            dnsLookups.push({hostname, opts});
            const entry = dnsMap.get(hostname);
            if (typeof entry === 'function') return entry(hostname, opts);
            return entry ?? [];
        }
    },
    'node:http': {request: mockRequest},
    'node:https': {request: mockRequest},
});

const scraper = loadModule('src/lib/server/scraper/index.ts', {
    '../remote-image.js': remoteImage,
});

const scrapeRoute = loadModule('src/routes/api/recipes/scrape/+server.ts', {
    '@sveltejs/kit': {
        json: (data, init = {}) => ({status: init.status ?? 200, body: data}),
    },
    '$lib/server/scraper/index.js': scraper,
    '$lib/server/remote-image.js': remoteImage,
    '$lib/server/ai/index.js': {
        generateRecipeFromHtml: async () => {
            throw new Error('AI fallback should not be invoked');
        }
    },
    '$lib/server/ai/availability.js': {
        isAiAvailable: async () => false,
    },
    '$lib/server/ai/rate-limit.js': {
        checkAiRateLimit: () => false,
    },
    '$lib/paraglide/runtime': {
        getLocale: () => 'en',
    },
});

const {fetchPublicResource, UnsafeRemoteUrlError} = remoteImage;
const {fetchRecipePage, MAX_RECIPE_PAGE_BYTES} = scraper;
const {POST} = scrapeRoute;

async function callScrape(url, user = {id: 'user-1'}) {
    return POST({
        locals: {user},
        request: {json: async () => ({url})},
    });
}

describe('recipe scraper SSRF & IPv6 handling', () => {
    beforeEach(() => {
        resetMocks();
    });

    test('allows dual-stack hostnames with public IPv4 + public IPv6 and pins IPv4', async () => {
        queuedResponses = [{chunks: [SAMPLE_RECIPE_HTML]}];
        const res1 = await callScrape('https://dualstack.example/pasta');
        assert.equal(res1.status, 200);
        assert.equal(res1.body.title, 'Tomato Pasta');
        assert.equal(recordedRequests.length, 1);
        assert.equal(recordedRequests[0].family, 4);
        assert.deepEqual(recordedRequests[0].pinnedSingle, {address: '93.184.216.34', family: 4});
        assert.deepEqual(recordedRequests[0].pinnedAll, [{address: '93.184.216.34', family: 4}]);

        queuedResponses = [{chunks: [SAMPLE_RECIPE_HTML]}];
        const res2 = await callScrape('https://ipv4first.example/pasta');
        assert.equal(res2.status, 200);
        assert.equal(res2.body.title, 'Tomato Pasta');
        assert.equal(recordedRequests.length, 2);
        assert.equal(recordedRequests[1].family, 4);
        assert.deepEqual(recordedRequests[1].pinnedSingle, {address: '93.184.216.34', family: 4});
    });

    test('allows pure public IPv6 hostnames and literal public IPv6 URLs', async () => {
        queuedResponses = [{chunks: [SAMPLE_RECIPE_HTML]}];
        const res = await callScrape('https://ipv6only.example/pasta');
        assert.equal(res.status, 200);
        assert.equal(res.body.title, 'Tomato Pasta');
        assert.equal(recordedRequests.length, 1);
        assert.equal(recordedRequests[0].family, 6);
        assert.deepEqual(recordedRequests[0].pinnedSingle, {address: '2606:4700:4700::1111', family: 6});

        queuedResponses = [{chunks: [SAMPLE_RECIPE_HTML]}];
        const literalRes = await callScrape('https://[2606:4700:4700::1111]/pasta');
        assert.equal(literalRes.status, 200);
        assert.equal(recordedRequests.length, 2);
        assert.equal(recordedRequests[1].family, 6);
        assert.deepEqual(recordedRequests[1].pinnedSingle, {address: '2606:4700:4700::1111', family: 6});
        assert.equal(dnsLookups.length, 1, 'Literal IPv6 should not trigger DNS lookup');
    });

    test('blocks redirects from public URLs to private/internal targets with 400 and UnsafeRemoteUrlError', async () => {
        const unsafeRedirectTargets = [
            'http://127.0.0.1/admin',
            '//127.0.0.1/protocol-relative',
            'http://169.254.169.254/latest/meta-data/',
            'http://[::1]/secret',
            'http://10.0.0.1/internal',
            'http://internal.example/secret',
            'file:///etc/passwd',
            'https://user:pass@public.example/recipe',
            'https://public.example:8443/recipe',
        ];

        for (const target of unsafeRedirectTargets) {
            resetMocks();
            queuedResponses = [{status: 302, headers: {location: target}}];
            await assert.rejects(
                () => fetchRecipePage('https://public.example/start'),
                (err) => err instanceof UnsafeRemoteUrlError,
                `fetchRecipePage should throw UnsafeRemoteUrlError for redirect to ${target}`
            );
            assert.equal(recordedRequests.length, 1, `Should not connect to redirect target ${target}`);

            resetMocks();
            queuedResponses = [{status: 301, headers: {location: target}}];
            const res = await callScrape('https://public.example/start');
            assert.equal(res.status, 400, `/api/recipes/scrape should return 400 for redirect to ${target}`);
            assert.equal(recordedRequests.length, 1, `Route should not connect to redirect target ${target}`);
        }
    });

    test('follows valid public redirects up to 5 hops and rejects exceeding 5 hops', async () => {
        queuedResponses = [
            {status: 301, headers: {location: '/step-1'}},
            {status: 302, headers: {location: '/step-2'}},
            {status: 303, headers: {location: '/step-3'}},
            {status: 307, headers: {location: '/step-4'}},
            {status: 308, headers: {location: 'https://ipv6only.example/final'}},
            {status: 200, chunks: [SAMPLE_RECIPE_HTML]},
        ];
        const res = await callScrape('https://public.example/start');
        assert.equal(res.status, 200);
        assert.equal(recordedRequests.length, 6);
        assert.equal(recordedRequests[5].family, 6);

        resetMocks();
        queuedResponses = Array.from({length: 6}, (_, i) => ({
            status: 302,
            headers: {location: `/loop-${i + 1}`}
        }));
        await assert.rejects(() => fetchRecipePage('https://public.example/loop'), /Too many redirects/);
    });

    test('blocks direct private IPs, invalid protocols, credentials, non-standard ports, and long URLs before connecting', async () => {
        const blockedUrls = [
            'http://127.0.0.1/recipe',
            'http://127.1/recipe',
            'http://10.0.0.1/recipe',
            'http://172.16.0.1/recipe',
            'http://192.168.1.1/recipe',
            'http://169.254.1.1/recipe',
            'http://169.254.169.254/latest/meta-data/',
            'http://100.64.0.1/recipe',
            'http://[::1]/recipe',
            'http://[fe80::1]/recipe',
            'http://[fc00::1]/recipe',
            'http://[::ffff:127.0.0.1]/recipe',
            'http://[2002:7f00:1::]/recipe',
            'http://[2001::1]/recipe',
            'file:///etc/passwd',
            'ftp://public.example/recipe',
            'https://user:pass@public.example/recipe',
            'https://public.example:8080/recipe',
            `https://public.example/${'a'.repeat(2050)}`,
        ];

        for (const url of blockedUrls) {
            resetMocks();
            await assert.rejects(
                () => fetchRecipePage(url),
                (err) => err instanceof UnsafeRemoteUrlError,
                `fetchRecipePage should reject ${url} with UnsafeRemoteUrlError`
            );
            assert.equal(recordedRequests.length, 0, `No network request allowed for ${url}`);

            const res = await callScrape(url);
            assert.equal(res.status, 400, `/api/recipes/scrape must return 400 for ${url}`);
            assert.equal(recordedRequests.length, 0, `No network request allowed via route for ${url}`);
        }
    });

    test('blocks mixed public + private DNS results and empty DNS results before connecting', async () => {
        for (const host of ['mixed.example', 'mixed-v6.example', 'empty.example']) {
            resetMocks();
            await assert.rejects(
                () => fetchRecipePage(`https://${host}/recipe`),
                (err) => err instanceof UnsafeRemoteUrlError,
                `${host} should be rejected with UnsafeRemoteUrlError`
            );
            assert.equal(recordedRequests.length, 0, `No network request allowed for ${host}`);

            const res = await callScrape(`https://${host}/recipe`);
            assert.equal(res.status, 400, `${host} should return HTTP 400`);
            assert.equal(recordedRequests.length, 0);
        }
    });

    test('resolves DNS once per hop and pins validated IP against DNS rebinding', async () => {
        let calls = 0;
        dnsMap.set('rebinding.example', () => {
            calls++;
            // Even if a second lookup would return loopback, fetchPublicResource must resolve once and pin
            return calls === 1
                ? [{address: '93.184.216.34', family: 4}]
                : [{address: '127.0.0.1', family: 4}];
        });
        queuedResponses = [{chunks: [SAMPLE_RECIPE_HTML]}];

        const html = await fetchRecipePage('https://rebinding.example/recipe');
        assert.match(html, /Tomato Pasta/);
        assert.equal(calls, 1, 'DNS must be resolved exactly once per hop');
        assert.equal(recordedRequests.length, 1);
        assert.deepEqual(recordedRequests[0].pinnedSingle, {address: '93.184.216.34', family: 4});
    });

    test('rejects oversized HTML responses via Content-Length and streamed body', async () => {
        queuedResponses = [{
            headers: {'content-length': String(MAX_RECIPE_PAGE_BYTES + 1)},
            chunks: ['small'],
        }];
        await assert.rejects(
            () => fetchRecipePage('https://public.example/huge-header'),
            /too large/i
        );

        const chunk = Buffer.alloc(1024 * 1024, 'a');
        queuedResponses = [{
            chunks: [chunk, chunk, chunk, chunk, chunk, Buffer.from('x')],
        }];
        await assert.rejects(
            () => fetchRecipePage('https://public.example/huge-stream'),
            /too large/i
        );

        queuedResponses = [{chunks: ['12345', '678901']}];
        await assert.rejects(
            () => fetchPublicResource('https://public.example/custom-limit', {maxBytes: 10}),
            /too large/i
        );
    });

    test('safely decodes gzip, deflate, and brotli while enforcing uncompressed byte limit', async () => {
        queuedResponses = [{
            headers: {'content-encoding': 'gzip'},
            chunks: [gzipSync(Buffer.from(SAMPLE_RECIPE_HTML))],
        }];
        assert.match(await fetchRecipePage('https://public.example/gzip'), /Tomato Pasta/);

        queuedResponses = [{
            headers: {'content-encoding': 'deflate'},
            chunks: [deflateSync(Buffer.from(SAMPLE_RECIPE_HTML))],
        }];
        assert.match(await fetchRecipePage('https://public.example/deflate'), /Tomato Pasta/);

        queuedResponses = [{
            headers: {'content-encoding': 'br'},
            chunks: [brotliCompressSync(Buffer.from(SAMPLE_RECIPE_HTML))],
        }];
        assert.match(await fetchRecipePage('https://public.example/br'), /Tomato Pasta/);

        // Small compressed payload that expands well beyond maxBytes (decompression bomb protection)
        const bomb = gzipSync(Buffer.alloc(10_000, 'A'));
        assert.ok(bomb.length < 200, 'Compressed payload itself should be small');
        queuedResponses = [{
            headers: {'content-encoding': 'gzip', 'content-length': String(bomb.length)},
            chunks: [bomb],
        }];
        await assert.rejects(
            () => fetchPublicResource('https://public.example/bomb', {maxBytes: 512}),
            /too large/i
        );
    });
});
