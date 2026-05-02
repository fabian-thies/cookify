import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { scrapeRecipe } from '$lib/server/scraper/index.js';
import { resolve4, resolve6 } from 'node:dns/promises';

function isPrivateIp(ip: string): boolean {
    // IPv6 loopback and link-local
    if (ip === '::1' || ip === '::' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;
    const [a, b, c, d] = parts;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254 && c === 169 && d === 254) return true;
    if (a >= 224) return true;
    return false;
}

async function isUrlInternal(url: URL): Promise<boolean> {
    const hostname = url.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '[::1]') return true;
    try {
        const addresses = await Promise.all([
            resolve4(hostname).catch(() => [] as string[]),
            resolve6(hostname).catch(() => [] as string[])
        ]);
        const allAddresses = addresses.flat();
        if (allAddresses.length === 0) return true;
        if (allAddresses.some(addr => isPrivateIp(addr))) return true;
    } catch {
        return true;
    }
    return false;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { url?: string };
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { url } = body;

    if (!url || typeof url !== 'string') {
        return json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
        new URL(url);
    } catch {
        return json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Only allow http/https URLs
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return json({ error: 'Only HTTP(S) URLs are allowed' }, { status: 400 });
    }

    // Block requests to internal/private IPs
    if (await isUrlInternal(parsedUrl)) {
        return json({ error: 'URLs pointing to internal networks are not allowed' }, { status: 400 });
    }

    try {
        const recipe = await scrapeRecipe(url);
        return json(recipe);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to scrape recipe';

        if (message.includes('No recipe found')) {
            return json({ error: message }, { status: 404 });
        }

        return json({ error: message }, { status: 500 });
    }
};
