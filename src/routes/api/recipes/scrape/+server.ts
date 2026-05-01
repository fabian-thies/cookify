import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { scrapeRecipe } from '$lib/server/scraper/index.js';

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
