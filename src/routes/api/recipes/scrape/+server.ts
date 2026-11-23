import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { fetchRecipePage, scrapeRecipeFromHtml } from '$lib/server/scraper/index.js';
import { UnsafeRemoteUrlError } from '$lib/server/remote-image.js';
import { generateRecipeFromHtml } from '$lib/server/ai/index.js';
import { isAiAvailable } from '$lib/server/ai/availability.js';
import { checkAiRateLimit } from '$lib/server/ai/rate-limit.js';
import { getLocale } from '$lib/paraglide/runtime';

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
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        return json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Only allow http/https URLs
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return json({ error: 'Only HTTP(S) URLs are allowed' }, { status: 400 });
    }

    let html: string;
    try {
        html = await fetchRecipePage(url);
    } catch (err) {
        if (err instanceof UnsafeRemoteUrlError) {
            return json({ error: err.message }, { status: 400 });
        }
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
