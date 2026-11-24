import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe, test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

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
            crypto,
            console,
            require: (name) => (name in imports ? imports[name] : require(name)),
        },
        {filename}
    );
    return exports;
}

const utils = loadModule('src/lib/utils.ts');
const authRateLimit = loadModule('src/lib/server/auth-rate-limit.ts');
const {sanitizeRedirectPath} = utils;
const ORIGIN = 'https://cookify.example';

describe('sanitizeRedirectPath', () => {
    test('allows valid relative paths with queries and hashes', () => {
        const validPaths = [
            '/',
            '/recipe/42',
            '/recipe/search?tag=pasta&q=tomato#results',
            '/meal-plan?week=2026-11-23',
        ];

        for (const path of validPaths) {
            assert.equal(sanitizeRedirectPath(path, ORIGIN), path);
        }
    });

    test('rejects backslash, protocol-relative, absolute, control-char, and non-string inputs', () => {
        const maliciousOrInvalidInputs = [
            '/\\evil.com',
            '//evil.com',
            '///evil.com',
            '/\\/evil.com',
            'https://evil.com/phish',
            'http://evil.com',
            'javascript:alert(1)',
            '/\tevil.com',
            '/\r\nLocation: https://evil.com',
            '/\x00evil.com',
            '/\x7fevil.com',
            'evil.com',
            '',
            null,
            undefined,
            123,
            true,
            {},
            ['/recipe/42'],
        ];

        for (const input of maliciousOrInvalidInputs) {
            assert.equal(
                sanitizeRedirectPath(input, ORIGIN),
                '/',
                `Expected ${JSON.stringify(input)} to normalize to '/'`
            );
        }
    });

    test('returns "/" when origin is invalid or opaque', () => {
        assert.equal(sanitizeRedirectPath('/recipe/42', 'not-a-valid-origin'), '/');
        assert.equal(sanitizeRedirectPath('/recipe/42', 'null'), '/');
        assert.equal(sanitizeRedirectPath('/recipe/42', 'data:text/html,hi'), '/');
    });
});

describe('login and register server actions redirect sanitization', () => {
    function loadLoginPageServer() {
        authRateLimit.clearAuthRateLimits();
        const userRow = {
            id: 'user-1',
            username: 'chefuser',
            passwordHash: 'hashed-password',
            email: 'chef@cookify.example',
        };

        const db = {
            select: () => ({
                from: () => ({
                    where: async () => [userRow],
                    limit: async () => [userRow],
                }),
            }),
            insert: () => ({
                values: async () => {},
            }),
        };

        const table = {
            user: {username: 'username'},
        };

        const session = {id: 'session-1', userId: 'user-1', expiresAt: new Date(Date.now() + 60_000)};

        return loadModule('src/routes/(auth)/login/+page.server.ts', {
            '$lib/paraglide/runtime': {getLocale: () => 'en'},
            '@node-rs/argon2': {verify: async () => true},
            '@oslojs/encoding': {encodeBase32LowerCase: () => 'generated-user-id'},
            '@sveltejs/kit': {
                fail: (status, data) => ({type: 'failure', status, data}),
                redirect: (status, location) => ({type: 'redirect', status, location}),
            },
            'drizzle-orm': {eq: () => ({})},
            '$lib/server/auth': {
                generateSessionToken: () => 'token-123',
                createSession: async () => session,
                setSessionTokenCookie: () => {},
            },
            '$lib/server/db': {getDb: () => db},
            '$lib/server/db/schema': table,
            '$lib/utils': utils,
            '$lib/server/utils': {hashPassword: async () => 'hashed-password'},
            '$lib/functions/site.remote': {getAllowRegistrations: async () => true},
            '$lib/server/auth-rate-limit': authRateLimit,
        });
    }

    function makeFormEvent(fields) {
        const formData = new FormData();
        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) {
                formData.set(key, value);
            }
        }
        return {
            url: new URL(`${ORIGIN}/login`),
            request: {
                formData: async () => formData,
            },
        };
    }

    test('login action redirects /\\evil.com to "/" and preserves safe relative paths', async () => {
        const {actions} = loadLoginPageServer();

        const maliciousResult = await actions.login(
            makeFormEvent({
                username: 'chefuser',
                password: 'secret-password',
                redirectTo: '/\\evil.com',
            })
        );
        assert.deepEqual(maliciousResult, {type: 'redirect', status: 302, location: '/'});

        const safeResult = await actions.login(
            makeFormEvent({
                username: 'chefuser',
                password: 'secret-password',
                redirectTo: '/recipe/search?tag=pasta&q=tomato#results',
            })
        );
        assert.deepEqual(safeResult, {
            type: 'redirect',
            status: 302,
            location: '/recipe/search?tag=pasta&q=tomato#results',
        });
    });

    test('register action redirects /\\evil.com to "/" and preserves safe relative paths', async () => {
        const {actions} = loadLoginPageServer();

        const maliciousResult = await actions.register(
            makeFormEvent({
                username: 'newchef',
                email: 'newchef@cookify.example',
                password: 'secret-password',
                confirmPassword: 'secret-password',
                redirectTo: '/\\evil.com',
            })
        );
        assert.deepEqual(maliciousResult, {type: 'redirect', status: 302, location: '/'});

        const safeResult = await actions.register(
            makeFormEvent({
                username: 'newchef',
                email: 'newchef@cookify.example',
                password: 'secret-password',
                confirmPassword: 'secret-password',
                redirectTo: '/meal-plan?week=2026-11-23',
            })
        );
        assert.deepEqual(safeResult, {
            type: 'redirect',
            status: 302,
            location: '/meal-plan?week=2026-11-23',
        });
    });
});

describe('source checks for vulnerable redirect patterns', () => {
    const vulnerablePattern = /startsWith\(['"]\/['"]\)\s*&&\s*![\w.]+\.startsWith\(['"]\/\/['"]\)/;

    test('login/+page.server.ts uses sanitizeRedirectPath in both actions and drops the vulnerable check', () => {
        const source = readFileSync('src/routes/(auth)/login/+page.server.ts', 'utf8');
        assert.equal(vulnerablePattern.test(source), false);
        const matches = source.match(/sanitizeRedirectPath\(redirectTo,\s*event\.url\.origin\)/g) ?? [];
        assert.equal(matches.length, 2, 'Expected sanitizeRedirectPath in both login and register actions');
    });

    test('LoginForm.svelte uses sanitizeRedirectPath in handlePasskeyLogin and drops the vulnerable check', () => {
        const source = readFileSync('src/lib/components/LoginForm.svelte', 'utf8');
        assert.equal(vulnerablePattern.test(source), false);
        assert.match(source, /import\s*\{[^}]*\bsanitizeRedirectPath\b[^}]*\}\s*from\s*["']\$lib\/utils\.js["']/);
        assert.match(source, /goto\(sanitizeRedirectPath\(redirectTo,\s*page\.url\.origin\)\)/);
    });
});
