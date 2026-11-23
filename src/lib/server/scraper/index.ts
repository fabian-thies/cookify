
import { fetchPublicResource, UnsafeRemoteUrlError } from '../remote-image.js';

export { UnsafeRemoteUrlError };

/**
 * Recipe scraper - extracts recipe data from external websites
 * using JSON-LD (schema.org/Recipe) structured data and HTML meta tags as fallback.
 */

export const MAX_RECIPE_PAGE_BYTES = 5 * 1024 * 1024;

export interface ScrapedRecipe {
    title: string;
    description: string;
    image: string | null;
    cookTime: number | null;
    servings: number | null;
    difficulty: string | null;
    ingredients: { name: string; amount: number | null; unit: string }[];
    steps: string[];
    tags: string[];
    sourceUrl: string;
}

function parseCookTime(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    const str = String(value).trim();
    if (!str) return null;
    // Plain number (minutes)
    const num = Number(str);
    if (!isNaN(num) && num > 0) return Math.round(num);
    // ISO 8601 duration (PT1H30M, PT45M, P0DT0H25M, etc.)
    const match = str.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!match) return null;
    const days = parseInt(match[1] || '0', 10);
    const hours = parseInt(match[2] || '0', 10);
    const minutes = parseInt(match[3] || '0', 10);
    const seconds = parseInt(match[4] || '0', 10);
    return days * 1440 + hours * 60 + minutes + Math.round(seconds / 60);
}

function parseServings(value: string | number | undefined | null): number | null {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number') return value;
    const str = String(value);
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

function parseIngredient(raw: string): { name: string; amount: number | null; unit: string } {
    const trimmed = raw.trim();
    if (!trimmed) return { name: '', amount: null, unit: '' };
    
    const unitPattern = '(?:tbsp|tablespoon|tsp|teaspoon|cup|cups|ml|l|liter|g|kg|oz|ounce|lb|pound|pinch|dash|clove|cloves|slice|slices|piece|pieces|can|cans|bunch|handful|stick|sticks|sprig|sprigs|small|medium|large|pck|pk|el|tl|bund|prise|prisen|spritzer|würfel|stange|zehe|rolle|becher|tasse|flasche|tropfen|messerspitze|glas|dose|scheibe|st|stueck|stuck|riegel|tube|blatt|zweig|knolle|etwas)\\.?';
    const unitRegex = new RegExp(`^(?<amount>\\d+(?:[\\/.,]\\d+)?(?:\\s+\\d+\\/\\d+)?)\\s*(?<unit>${unitPattern}\\s*)?(?<name>.+)`, 'i');
    
    // Try common patterns without explicit unit like "2 Eier", "1 Prise Salz"
    const noUnitMatch = trimmed.match(/^(?<amount>\d+(?:[\/.,]\d+)?(?:\s+\d+\/\d+)?)\s+(?<name>.+)$/);
    const unitMatch = trimmed.match(unitRegex);
    
    // If a known unit was matched, use that result
    if (unitMatch && unitMatch.groups && unitMatch.groups.unit) {
        // fall through to original logic below
    } else if (noUnitMatch && noUnitMatch.groups) {
        // No known unit detected – treat as amount + name without unit
        const amountStr = noUnitMatch.groups.amount?.trim() || '';
        const name = noUnitMatch.groups.name?.trim() || trimmed;
        let amount: number | null = null;
        try {
            const fractionMatch = amountStr.match(/^(\d+)\s*\/\s*(\d+)$/);
            if (fractionMatch) {
                amount = parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
            } else {
                amount = parseFloat(amountStr.replace(',', '.'));
            }
            if (isNaN(amount)) amount = null;
        } catch {
            amount = null;
        }
        return { name, amount, unit: '' };
    }

    const match = trimmed.match(unitRegex);

    if (match && match.groups) {
        const amountStr = match.groups.amount?.trim() || '';
        const unit = match.groups.unit?.trim() || '';
        const name = match.groups.name?.trim() || trimmed;

        let amount: number | null = null;
        try {
            const fractionMatch = amountStr.match(/^(\d+)\s*\/\s*(\d+)$/);
            if (fractionMatch) {
                amount = parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
            } else if (amountStr.includes('/')) {
                const parts = amountStr.split(/\s+/);
                let total = 0;
                for (const part of parts) {
                    const fracMatch = part.match(/^(\d+)\/(\d+)$/);
                    if (fracMatch) {
                        total += parseInt(fracMatch[1], 10) / parseInt(fracMatch[2], 10);
                    } else {
                        total += parseFloat(part);
                    }
                }
                amount = total;
            } else {
                amount = parseFloat(amountStr.replace(',', '.'));
            }
            if (isNaN(amount)) amount = null;
        } catch {
            amount = null;
        }

        return { name, amount, unit };
    }

    return { name: trimmed, amount: null, unit: '' };
}

export function extractFromJsonLd(jsonLd: unknown): ScrapedRecipe | null {
    if (!jsonLd || typeof jsonLd !== 'object') return null;

    if (Array.isArray(jsonLd)) {
        let fallback: ScrapedRecipe | null = null;
        for (const item of jsonLd) {
            const recipe = extractFromJsonLd(item);
            if (recipe?.title) return recipe;
            if (recipe && !fallback) fallback = recipe;
        }
        return fallback;
    }

    const record = jsonLd as Record<string, unknown>;
    let graphFallback: ScrapedRecipe | null = null;
    if (Array.isArray(record['@graph'])) {
        const recipe = extractFromJsonLd(record['@graph']);
        if (recipe?.title) return recipe;
        if (recipe) graphFallback = recipe;
    }

    const types = record['@type'];
    const typeList = Array.isArray(types) ? types : [types];
    const isRecipe = typeList.some(t => typeof t === 'string' && t.includes('Recipe'));

    if (!isRecipe) return graphFallback;

    const name = typeof record['name'] === 'string' ? record['name'] : '';
    const description = typeof record['description'] === 'string' ? record['description'] : '';

    let image: string | null = null;
    const imageData = record['image'];
    if (typeof imageData === 'string') {
        image = imageData;
    } else if (Array.isArray(imageData)) {
        for (const img of imageData) {
            if (typeof img === 'string' && img.trim()) {
                image = img;
                break;
            }
            if (img && typeof img === 'object' && typeof (img as Record<string, unknown>)['url'] === 'string') {
                const candidate = (img as Record<string, unknown>)['url'] as string;
                if (candidate.trim()) {
                    image = candidate;
                    break;
                }
            }
        }
    } else if (imageData && typeof imageData === 'object' && typeof (imageData as Record<string, unknown>)['url'] === 'string') {
        image = (imageData as Record<string, unknown>)['url'] as string || null;
    }

    const cookTime = parseCookTime(record['cookTime']) 
        ?? parseCookTime(record['totalTime']) 
        ?? parseCookTime(record['prepTime']);

    const servings = parseServings(String(record['recipeYield'] ?? record['yield'] ?? ''));

    const difficulty = (() => {
        const d = record['recipeDifficulty'];
        if (typeof d === 'string') return d.toLowerCase();
        if (typeof d === 'number') {
            if (d <= 1) return 'easy';
            if (d <= 2) return 'medium';
            return 'hard';
        }
        return null;
    })();

    const rawIngredients = Array.isArray(record['recipeIngredient']) ? record['recipeIngredient'] : [];
    const ingredients = rawIngredients
        .filter((ing): ing is string => typeof ing === 'string')
        .map(parseIngredient);

    const instructions = record['recipeInstructions'];
    let steps: string[] = [];

    function extractStepsFromInstructions(data: unknown): string[] {
        if (typeof data === 'string') {
            return data.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
        }
        if (!Array.isArray(data)) return [];

        const result: string[] = [];
        for (const item of data as unknown[]) {
            if (typeof item === 'string') {
                result.push(...item.split(/\n{2,}/).map(s => s.trim()).filter(Boolean));
            } else if (typeof item === 'object' && item !== null) {
                const obj = item as Record<string, unknown>;
                // Handle HowToSection with nested itemListElement
                if (Array.isArray(obj['itemListElement'])) {
                    result.push(...extractStepsFromInstructions(obj['itemListElement']));
                } else {
                    const text = (obj['text'] as string) || (obj['name'] as string) || '';
                    if (text) {
                        result.push(...text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean));
                    }
                }
            }
        }
        return result;
    }

    steps = extractStepsFromInstructions(instructions);

    const tags: string[] = [];
    const categories = record['recipeCategory'];
    if (typeof categories === 'string') tags.push(categories);
    else if (Array.isArray(categories)) tags.push(...categories.filter((c): c is string => typeof c === 'string'));

    const cuisines = record['recipeCuisine'];
    if (typeof cuisines === 'string') tags.push(cuisines);
    else if (Array.isArray(cuisines)) tags.push(...cuisines.filter((c): c is string => typeof c === 'string'));

    const keywords = record['keywords'];
    if (typeof keywords === 'string') {
        tags.push(...keywords.split(',').map(k => k.trim()));
    } else if (Array.isArray(keywords)) {
        tags.push(...keywords.filter((k): k is string => typeof k === 'string'));
    }

    return {
        title: name,
        description,
        image,
        cookTime,
        servings,
        difficulty,
        ingredients,
        steps,
        tags: [...new Set(tags.filter(Boolean))],
        sourceUrl: typeof record['url'] === 'string' ? record['url'] : ''
    };
}

function resolveUrl(candidate: string | null, baseUrl: string): string | null {
    if (!candidate) return null;
    const trimmed = candidate.trim();
    if (!trimmed) return null;
    try {
        return new URL(trimmed, baseUrl).href;
    } catch {
        return trimmed;
    }
}

export async function fetchRecipePage(url: string): Promise<string> {
    const { buffer } = await fetchPublicResource(url, {
        maxBytes: MAX_RECIPE_PAGE_BYTES,
        timeoutMs: 15_000,
        maxRedirects: 5,
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CookifyRecipeBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Encoding': 'identity',
        }
    });

    return buffer.toString('utf8');
}

export function scrapeRecipeFromHtml(html: string, url: string): ScrapedRecipe | null {
    const jsonLdRegex = /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = jsonLdRegex.exec(html)) !== null) {
        try {
            const jsonLd: unknown = JSON.parse(match[1]);
            const recipe = extractFromJsonLd(jsonLd);
            if (recipe && recipe.title) {
                recipe.sourceUrl = url;
                if (recipe.image) {
                    recipe.image = resolveUrl(recipe.image, url);
                }
                return recipe;
            }
        } catch {
            // Skip invalid JSON-LD blocks
        }
    }

    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
        || html.match(/<title>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
        || html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);

    if (titleMatch) {
        return {
            title: decodeHtmlEntities(titleMatch[1].trim()),
            description: descMatch ? decodeHtmlEntities(descMatch[1].trim()) : '',
            image: imageMatch ? resolveUrl(decodeHtmlEntities(imageMatch[1].trim()), url) : null,
            cookTime: null,
            servings: null,
            difficulty: null,
            ingredients: [],
            steps: [],
            tags: [],
            sourceUrl: url
        };
    }

    return null;
}

function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}
