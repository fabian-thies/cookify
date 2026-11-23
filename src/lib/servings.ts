export const MAX_SERVINGS = 999;

export function parseServings(value: number | string | null | undefined): number | undefined {
    if (typeof value === 'string' && !/^\d+$/.test(value)) return undefined;
    const servings = Number(value);
    return Number.isInteger(servings) && servings >= 1 && servings <= MAX_SERVINGS ? servings : undefined;
}

export function scaleIngredientQuantity(quantity: number, recipeServings: number, desiredServings: number): string {
    const value = recipeServings > 0 ? quantity * (desiredServings / recipeServings) : quantity;
    return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '';
}

export function servingsQuery(servings: number | undefined): string {
    return servings === undefined ? '' : `?servings=${servings}`;
}
