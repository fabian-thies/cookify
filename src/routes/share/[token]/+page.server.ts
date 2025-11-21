import type {PageServerLoad} from "./$types";
import {error} from "@sveltejs/kit";
import {
    getIngredients,
    getRecipeByShareToken,
    getRecipeRatingSummary,
    getSteps,
    incrementRecipeViewCount
} from "$lib/server/db/recipe";

export const load: PageServerLoad = async (event) => {
    const token = event.params.token;

    if (!token) {
        throw error(400, "Missing share token");
    }

    const recipe = await getRecipeByShareToken(token);

    if (!recipe) {
        throw error(404, "Recipe not found or share link inactive");
    }

    await incrementRecipeViewCount(recipe.id);

    const [steps, ingredients, ratingSummary] = await Promise.all([
        getSteps(recipe.id),
        getIngredients(recipe.id),
        getRecipeRatingSummary(recipe.id)
    ]);

    return {
        recipe: {
            ...recipe,
            ingredients,
            steps,
            averageRating: ratingSummary.average,
            ratingCount: ratingSummary.count,
            userRating: null,
            isFavorite: false,
            sharePath: `/share/${token}`,
            shareEnabled: true
        }
    };
};
