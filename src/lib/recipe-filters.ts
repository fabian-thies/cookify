import {DIFFICULTIES} from './constants';

export const COOK_TIME_FILTERS = ['0-15', '15-30', '30-60', '60+'] as const;
export type CookTimeFilter = (typeof COOK_TIME_FILTERS)[number];

export const RECIPE_SORT_OPTIONS = ['recent', 'rating', 'cookTime', 'lastCooked'] as const;
export type RecipeSortOption = (typeof RECIPE_SORT_OPTIONS)[number];
export const DEFAULT_RECIPE_SORT: RecipeSortOption = 'recent';
export const DEFAULT_RECIPE_PAGE_SIZE = 24;

export interface RecipeFilterState {
    search: string;
    ingredientsOnly: boolean;
    difficulty: string;
    cookTime: string;
    tag: string;
    author: string;
    sort: RecipeSortOption;
}

export interface RecipeListQuery {
    orderBy: RecipeSortOption;
    difficulty: string;
    cookTime: string;
    tag: string;
    author: string;
}

const VALID_COOK_TIMES = new Set<string>(COOK_TIME_FILTERS);
const VALID_DIFFICULTIES = new Set<string>(DIFFICULTIES);
const VALID_SORTS = new Set<string>(RECIPE_SORT_OPTIONS);

export function isCookTimeFilter(value: string): value is CookTimeFilter {
    return VALID_COOK_TIMES.has(value);
}

export function isDifficultyFilter(value: string): value is (typeof DIFFICULTIES)[number] {
    return VALID_DIFFICULTIES.has(value);
}

export function isRecipeSortOption(value: string): value is RecipeSortOption {
    return VALID_SORTS.has(value);
}

export function matchesCookTimeFilter(cookingTime: number, filter: string): boolean {
    switch (filter) {
        case '0-15':
            return cookingTime <= 15;
        case '15-30':
            return cookingTime > 15 && cookingTime <= 30;
        case '30-60':
            return cookingTime > 30 && cookingTime <= 60;
        case '60+':
            return cookingTime > 60;
        default:
            return true;
    }
}

export function parseRecipeFilterParams(
    params: URLSearchParams,
    options: {fallbackTag?: string; allowIngredientsOnly?: boolean} = {}
): RecipeFilterState {
    const rawDifficulty = params.get('difficulty') ?? '';
    const rawCookTime = params.get('cookTime') ?? '';
    const rawAuthor = params.get('author') ?? '';
    const rawTag = params.get('tag') ?? options.fallbackTag ?? '';
    const rawSort = params.get('sort') ?? '';

    return {
        search: params.get('q') ?? '',
        ingredientsOnly: options.allowIngredientsOnly ? params.get('ingredientsOnly') === '1' : false,
        difficulty: VALID_DIFFICULTIES.has(rawDifficulty) ? rawDifficulty : '',
        cookTime: VALID_COOK_TIMES.has(rawCookTime) ? rawCookTime : '',
        tag: rawTag.trim(),
        author: rawAuthor === 'user' ? 'user' : '',
        sort: isRecipeSortOption(rawSort) ? rawSort : DEFAULT_RECIPE_SORT
    };
}

export function applyRecipeFilterParams(
    currentUrl: URL,
    state: RecipeFilterState,
    options: {allowIngredientsOnly?: boolean} = {}
): URL {
    const nextUrl = new URL(currentUrl.toString());
    const params = nextUrl.searchParams;

    const trimmedSearch = state.search.trim();
    if (trimmedSearch) params.set('q', trimmedSearch);
    else params.delete('q');

    if (VALID_DIFFICULTIES.has(state.difficulty)) params.set('difficulty', state.difficulty);
    else params.delete('difficulty');

    if (VALID_COOK_TIMES.has(state.cookTime)) params.set('cookTime', state.cookTime);
    else params.delete('cookTime');

    const trimmedTag = state.tag.trim();
    if (trimmedTag) params.set('tag', trimmedTag);
    else params.delete('tag');

    if (state.author === 'user') params.set('author', 'user');
    else params.delete('author');

    if (options.allowIngredientsOnly && state.ingredientsOnly) params.set('ingredientsOnly', '1');
    else params.delete('ingredientsOnly');

    if (isRecipeSortOption(state.sort) && state.sort !== DEFAULT_RECIPE_SORT) params.set('sort', state.sort);
    else params.delete('sort');

    return nextUrl;
}
