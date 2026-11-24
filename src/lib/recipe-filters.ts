export const COOK_TIME_FILTERS = ['0-15', '15-30', '30-60', '60+'] as const;
export type CookTimeFilter = (typeof COOK_TIME_FILTERS)[number];

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
