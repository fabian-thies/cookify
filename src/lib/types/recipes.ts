import type {Recipe} from "$lib/server/db/schema";

type RecipesResponse = {
    success: boolean;
    recipes: Recipe[];
    pagination: {
        page: number;
        limit: number;
        hasNextPage: boolean;
    };
};

type SavedStatusResponse = {
    saved: { userId: string, recipeId: number }[];
};

export type IngredientInput = {
    id?: number;
    name: string;
    quantity: string;
    recipeId?: number;
};