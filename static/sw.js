const VERSION = 'v1';
const STATIC_CACHE = `cookify-${VERSION}-static`;
const PAGE_CACHE = `cookify-${VERSION}-pages`;
const IMAGE_CACHE = `cookify-${VERSION}-images`;
const OFFLINE_URL = '/offline';

const PRECACHE_URLS = [
    OFFLINE_URL,
    '/manifest.webmanifest',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/apple-touch-icon.png'
];

const MAX_PAGE_ENTRIES = 30;
const MAX_IMAGE_ENTRIES = 80;

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(STATIC_CACHE);
        // Individual requests: one flaky asset must not block the whole install.
        await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(
            keys
                .filter((key) => !key.startsWith(`cookify-${VERSION}-`))
                .map((key) => caches.delete(key))
        );
        await self.clients.claim();
    })());
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data?.type === 'CLEAR_CACHES') {
        event.waitUntil(
            caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        );
    }
});

async function trimCache(cacheName, maxEntries) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;
    await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

async function networkFirst(request, cacheName, maxEntries) {
    const cache = await caches.open(cacheName);
    try {
        const response = await fetch(request);
        if (response.ok && response.status === 200) {
            try {
                await cache.put(request, response.clone());
                await trimCache(cacheName, maxEntries);
            } catch {
                // A cache write must never fail the live response.
            }
        }
        return response;
    } catch {
        const cached = await cache.match(request);
        if (cached) return cached;

        if (request.mode === 'navigate') {
            const offline = await caches.match(OFFLINE_URL);
            if (offline) return offline;
        }

        return Response.error();
    }
}

async function cacheFirst(request, cacheName, maxEntries) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok && response.status === 200) {
        try {
            await cache.put(request, response.clone());
            if (maxEntries) await trimCache(cacheName, maxEntries);
        } catch {
            // Ignore cache quota/unsupported-response errors.
        }
    }
    return response;
}

function isStaticAsset(pathname) {
    return pathname.startsWith('/_app/immutable/') ||
        pathname.startsWith('/fonts/') ||
        pathname.startsWith('/icons/') ||
        pathname === '/favicon.svg' ||
        pathname === '/manifest.webmanifest';
}

self.addEventListener('fetch', (event) => {
    const {request} = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // Remote-function transport, mutations, auth flows and calendar downloads stay online-only.
    if (url.pathname.startsWith('/_app/remote/') ||
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/calendar/') ||
        url.pathname === '/login' ||
        url.pathname === '/logout') {
        return;
    }

    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    if (url.pathname.startsWith('/uploads/')) {
        event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES));
        return;
    }

    // SvelteKit client-side navigation data.
    if (url.pathname.includes('__data.json')) {
        event.respondWith(networkFirst(request, PAGE_CACHE, MAX_PAGE_ENTRIES));
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, PAGE_CACHE, MAX_PAGE_ENTRIES));
    }
});
