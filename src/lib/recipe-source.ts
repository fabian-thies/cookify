export const MAX_RECIPE_SOURCE_URL_LENGTH = 2048;

export function normalizeRecipeSourceUrl(input: string | null | undefined): string | null {
    const value = input?.trim();
    if (!value || value.length > MAX_RECIPE_SOURCE_URL_LENGTH || !/^https?:\/\//i.test(value)) return null;

    try {
        const url = new URL(value);
        if (url.username || url.password || url.href.length > MAX_RECIPE_SOURCE_URL_LENGTH) return null;
        return url.href;
    } catch {
        return null;
    }
}
