import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { fetchRecipePage, scrapeRecipeFromHtml } from '$lib/server/scraper/index.js';
import { generateRecipeFromHtml } from '$lib/server/ai/index.js';
import { isAiAvailable } from '$lib/server/ai/availability.js';
import { checkAiRateLimit } from '$lib/server/ai/rate-limit.js';
import { getLocale } from '$lib/paraglide/runtime';
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

    let html: string;
    try {
        html = await fetchRecipePage(url);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to scrape recipe';
        return json({ error: message }, { status: 500 });
    }

    const scraped = scrapeRecipeFromHtml(html, url);
    const needsAiFallback = !scraped || scraped.ingredients.length === 0 || scraped.steps.length === 0;

    if (needsAiFallback) {
        try {
            if (await isAiAvailable() && checkAiRateLimit(locals.user.id)) {
                return json(await generateRecipeFromHtml(html, url, getLocale()));
            }
        } catch (err) {
            console.error('AI recipe import fallback failed:', err);
        }
    }

    if (scraped) {
        return json(scraped);
    }

    return json({ error: 'No recipe found on this page.' }, { status: 404 });
};
