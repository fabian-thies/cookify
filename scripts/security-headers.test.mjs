import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe, test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function loadHooks() {
    const source = ts.transpileModule(readFileSync('src/hooks.server.ts', 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
    }).outputText;

    const sequence = (...handlers) => ({event, resolve}) => {
        const dispatch = (index) => (evt) => {
            if (index >= handlers.length) return resolve(evt);
            return handlers[index]({event: evt, resolve: dispatch(index + 1)});
        };
        return dispatch(0)(event);
    };

    const imports = {
        '@sveltejs/kit/hooks': {sequence},
        '$lib/server/auth': {
            sessionCookieName: 'auth-session',
            validateSessionToken: async () => ({session: null, user: null}),
            setSessionTokenCookie() {},
            deleteSessionTokenCookie() {},
        },
        '$lib/paraglide/server': {
            paraglideMiddleware: (request, cb) => cb({request, locale: 'en'})
        },
        '$env/dynamic/private': {env: {}},
        '$lib/server/locale': {resolveAppLocale: () => 'en'},
        '$lib/offline-recipes': {OFFLINE_ACCOUNT_COOKIE: 'cookify-offline-account'}
    };

    const exports = {};
    vm.runInNewContext(source, {
        exports,
        Headers,
        Request,
        Response,
        require: name => name in imports ? imports[name] : require(name)
    }, {filename: 'src/hooks.server.ts'});
    return exports;
}

function makeEvent() {
    return {
        request: new Request('https://cookify.example/'),
        locals: {},
        cookies: {
            get: () => undefined,
            set() {},
            getAll: () => []
        }
    };
}

describe('global security headers in hooks.server.ts', () => {
    const {handle} = loadHooks();

    test('sets Referrer-Policy, X-Content-Type-Options, and X-Frame-Options on responses', async () => {
        const response = await handle({
            event: makeEvent(),
            resolve: async () => new Response('ok', {status: 200})
        });

        assert.equal(response.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
        assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
        assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
    });

    test('preserves explicitly set response headers without overwriting', async () => {
        const response = await handle({
            event: makeEvent(),
            resolve: async () => new Response('ok', {
                status: 200,
                headers: {'X-Frame-Options': 'SAMEORIGIN'}
            })
        });

        assert.equal(response.headers.get('X-Frame-Options'), 'SAMEORIGIN');
        assert.equal(response.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
        assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    });

    test('handles responses with immutable headers such as Response.redirect', async () => {
        const response = await handle({
            event: makeEvent(),
            resolve: async () => Response.redirect('https://cookify.example/login', 302)
        });

        assert.equal(response.status, 302);
        assert.equal(response.headers.get('location'), 'https://cookify.example/login');
        assert.equal(response.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
        assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
        assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
    });
});
