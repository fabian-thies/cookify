import type {Recipe} from "$lib/server/db/schema";

export type RecipesResponse = {
    success: boolean;
    recipes: Recipe[];
    pagination: {
        page: number;
        limit: number;
        hasNextPage: boolean;
    };
};

export type RecipeResponse = {
    success: boolean;
    recipe: Recipe;
}

export type SavedStatusResponse = {
    saved: { userId: string, recipeId: number }[];
};

export type Ingredient = {
    id: number;
    name: string;
    quantity: string;
    recipeId: number;
};