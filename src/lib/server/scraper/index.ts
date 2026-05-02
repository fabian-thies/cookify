
/**
 * Recipe scraper - extracts recipe data from external websites
 * using JSON-LD (schema.org/Recipe) structured data and HTML meta tags as fallback.
 */

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

function parseIsoDuration(iso: string | undefined | null): number | null {
    if (!iso) return null;
    const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!match) return null;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 60 + minutes + Math.round(seconds / 60);
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
    
    // Try common patterns without explicit unit like "2 Eier", "1 Prise Salz"
    const noUnitMatch = trimmed.match(/^(?<amount>\d+(?:[\/.,]\d+)?(?:\s+\d+\/\d+)?)\s+(?<name>.+)$/);
    const unitMatch = trimmed.match(
        /^(?<amount>\d+(?:[\/.,]\d+)?(?:\s+\d+\/\d+)?)\s*(?<unit>(?:tbsp|tablespoon|tsp|teaspoon|cup|cups|ml|l|liter|g|kg|oz|ounce|lb|pound|pinch|dash|clove|cloves|slice|slices|piece|pieces|can|cans|bunch|handful|stick|sticks|sprig|sprigs|small|medium|large)\.?\s*)?(?<name>.+)/i
    );
    
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

    const match = trimmed.match(
        /^(?<amount>\d+(?:[\/.,]\d+)?(?:\s+\d+\/\d+)?)\s*(?<unit>(?:tbsp|tablespoon|tsp|teaspoon|cup|cups|ml|l|liter|g|kg|oz|ounce|lb|pound|pinch|dash|clove|cloves|slice|slices|piece|pieces|can|cans|bunch|handful|stick|sticks|sprig|sprigs|small|medium|large)\.?\s*)?(?<name>.+)/i
    );

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

function extractFromJsonLd(jsonLd: Record<string, unknown>): ScrapedRecipe | null {
    if (jsonLd['@graph'] && Array.isArray(jsonLd['@graph'])) {
        for (const item of jsonLd['@graph'] as Record<string, unknown>[]) {
            const recipe = extractFromJsonLd(item);
            if (recipe) return recipe;
        }
    }

    const types = jsonLd['@type'];
    const typeList = Array.isArray(types) ? types : [types];
    const isRecipe = typeList.some(t => String(t).includes('Recipe'));

    if (!isRecipe) return null;

    const name = typeof jsonLd['name'] === 'string' ? jsonLd['name'] : '';
    const description = typeof jsonLd['description'] === 'string' ? jsonLd['description'] : '';

    let image: string | null = null;
    const imageData = jsonLd['image'];
    if (typeof imageData === 'string') {
        image = imageData;
    } else if (Array.isArray(imageData)) {
        const firstImage = imageData.find((img: unknown) => typeof img === 'string');
        if (firstImage) image = firstImage as string;
        else if (imageData[0] && typeof imageData[0] === 'object') {
            image = (imageData[0] as Record<string, unknown>)['url'] as string || null;
        }
    } else if (imageData && typeof imageData === 'object') {
        image = (imageData as Record<string, unknown>)['url'] as string || null;
    }

    const cookTime = parseIsoDuration(
        (jsonLd['cookTime'] as string) || (jsonLd['totalTime'] as string) || (jsonLd['prepTime'] as string)
    );

    const servings = parseServings(String(jsonLd['recipeYield'] || jsonLd['yield'] || ''));

    const difficulty = typeof jsonLd['recipeDifficulty'] === 'string'
        ? (jsonLd['recipeDifficulty'] as string).toLowerCase()
        : null;

    const rawIngredients = Array.isArray(jsonLd['recipeIngredient']) ? jsonLd['recipeIngredient'] : [];
    const ingredients = (rawIngredients as string[]).map(parseIngredient);

    const instructions = jsonLd['recipeInstructions'];
    let steps: string[] = [];

    if (typeof instructions === 'string') {
        steps = [instructions];
    } else if (Array.isArray(instructions)) {
        steps = (instructions as Record<string, unknown>[]).map((item) => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object') {
                return (item as Record<string, unknown>)['text'] as string
                    || (item as Record<string, unknown>)['name'] as string
                    || '';
            }
            return String(item);
        }).filter(Boolean);
    }

    const tags: string[] = [];
    const categories = jsonLd['recipeCategory'];
    if (typeof categories === 'string') tags.push(categories);
    else if (Array.isArray(categories)) tags.push(...(categories as string[]));

    const cuisines = jsonLd['recipeCuisine'];
    if (typeof cuisines === 'string') tags.push(cuisines);
    else if (Array.isArray(cuisines)) tags.push(...(cuisines as string[]));

    const keywords = jsonLd['keywords'];
    if (typeof keywords === 'string') {
        tags.push(...keywords.split(',').map(k => k.trim()));
    } else if (Array.isArray(keywords)) {
        tags.push(...(keywords as string[]));
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
        sourceUrl: (jsonLd['url'] as string) || ''
    };
}

export async function scrapeRecipe(url: string): Promise<ScrapedRecipe> {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CookifyRecipeBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    const jsonLdRegex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = jsonLdRegex.exec(html)) !== null) {
        try {
            const jsonLd = JSON.parse(match[1]) as Record<string, unknown>;
            const recipe = extractFromJsonLd(jsonLd);
            if (recipe && recipe.title) {
                recipe.sourceUrl = url;
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
            image: imageMatch ? imageMatch[1] : null,
            cookTime: null,
            servings: null,
            difficulty: null,
            ingredients: [],
            steps: [],
            tags: [],
            sourceUrl: url
        };
    }

    throw new Error('No recipe found on this page.');
}

function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}
