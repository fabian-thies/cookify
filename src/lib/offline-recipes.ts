export const OFFLINE_ACCOUNT_COOKIE = 'cookify-offline-account';
const STORAGE_PREFIX = 'cookify-offline-recipe:';

export type OfflineRecipe = {
    id: number;
    title: string;
    description: string;
    servings: number;
    ingredients: {id: number; name: string; quantity: number | null; unit: string}[];
    steps: {id: number; step: string; number: number}[];
    tips: {id: number; tip: string; recipeId: number}[];
};

function accountPrefix(expectedAccount?: string): string | null {
    const prefix = `${OFFLINE_ACCOUNT_COOKIE}=`;
    const account = document.cookie.split('; ').find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
    if (!account || (expectedAccount && account !== encodeURIComponent(expectedAccount))) return null;
    return `${STORAGE_PREFIX}${account}:`;
}

function readRecipe(key: string): OfflineRecipe | null {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function getOfflineRecipe(id: number, expectedAccount?: string): OfflineRecipe | null {
    const prefix = accountPrefix(expectedAccount);
    return prefix ? readRecipe(prefix + id) : null;
}

export function listOfflineRecipes(): OfflineRecipe[] {
    const prefix = accountPrefix();
    const recipes: OfflineRecipe[] = [];
    if (!prefix) return recipes;

    try {
        for (const key of Object.keys(localStorage)) {
            if (!key.startsWith(prefix)) continue;
            const recipe = readRecipe(key);
            if (recipe) recipes.push(recipe);
        }
    } catch {
        return [];
    }

    return recipes.sort((a, b) => a.title.localeCompare(b.title));
}

export function saveOfflineRecipe(recipe: OfflineRecipe, expectedAccount: string): void {
    const prefix = accountPrefix(expectedAccount);
    if (!prefix) throw new Error('Account changed');

    const {id, title, description, servings, ingredients, steps, tips} = recipe;
    localStorage.setItem(prefix + id, JSON.stringify({id, title, description, servings, ingredients, steps, tips}));
}

export function removeOfflineRecipe(id: number, expectedAccount?: string): void {
    const prefix = accountPrefix(expectedAccount);
    if (prefix) localStorage.removeItem(prefix + id);
}

export function clearOfflineRecipes(): void {
    const prefix = accountPrefix();
    if (!prefix) return;

    try {
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(prefix)) localStorage.removeItem(key);
        }
    } catch {
        // The browser can disable storage. It must not prevent logout.
    }
}
