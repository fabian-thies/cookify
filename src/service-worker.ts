/// <reference lib="webworker" />
import {build, files, prerendered, version} from '$service-worker';
import {parseServings} from './lib/servings';

const worker = self as unknown as ServiceWorkerGlobalScope;
const cacheName = `cookify-shell-${version}`;
const offlineUrl = '/offline';
const assets = new Set([
    ...build,
    ...prerendered,
    ...files.filter((path) => path.startsWith('/icons/') || path === '/manifest.webmanifest' || path === '/favicon.svg')
]);

worker.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(cacheName);
        await cache.addAll([...assets]);
        await worker.skipWaiting();
    })());
});

worker.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys
            .filter((key) => key !== cacheName && (key.startsWith('cookify-shell-') || key.startsWith('cookify-v1-')))
            .map((key) => caches.delete(key)));
        await worker.clients.claim();
    })());
});

worker.addEventListener('fetch', (event) => {
    const {request} = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== worker.location.origin) return;

    if (assets.has(url.pathname)) {
        event.respondWith(caches.match(url.pathname, {cacheName}).then((cached) => cached ?? fetch(request)));
        return;
    }

    if (request.mode !== 'navigate' || url.pathname === '/login' || url.pathname === '/logout') return;

    event.respondWith(fetch(request).catch(() => {
        // The offline shell selects the current account's copy without caching an authenticated response.
        const recipe = /^\/recipe\/(\d+)(\/cook)?\/?$/.exec(url.pathname);
        const target = new URL(offlineUrl, worker.location.origin);
        if (recipe) {
            target.searchParams.set('recipe', recipe[1]);
            if (recipe[2]) target.searchParams.set('cook', '1');
            const servings = parseServings(url.searchParams.get('servings'));
            if (servings) target.searchParams.set('servings', String(servings));
        }
        return Response.redirect(target.href);
    }));
});
