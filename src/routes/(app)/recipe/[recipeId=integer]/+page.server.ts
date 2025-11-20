import type {PageServerLoad} from "./$types";
import {
    getIngredients,
    getRecipeById,
    getRecipeFavoriteState,
    getSteps,
    getRecipeRatingSummary,
    getUserRecipeRating,
    incrementRecipeViewCount
} from "$lib/server/db/recipe";
import {error} from "@sveltejs/kit";

export const load: PageServerLoad = async (event) => {
    const recipeId = Number(event.params.recipeId);

    if (Number.isNaN(recipeId)) {
        throw error(400, 'Wrong Recipe-ID');
    }

    const recipe = await getRecipeById(recipeId);

    if (recipe === null) {
        throw error(404, 'Recipe not found')
    }

    const viewerId = event.locals.user?.id;

    if (recipe.visibility === "private" && recipe.userId !== viewerId && !event.locals.user?.administrator) {
        throw error(403, 'Recipe is private');
    }

    await incrementRecipeViewCount(recipeId);

    const [steps, ingredients, isFavorite, ratingSummary, userRating] = await Promise.all([
        getSteps(recipeId),
        getIngredients(recipeId),
        getRecipeFavoriteState(event.locals.user!.id, recipeId),
        getRecipeRatingSummary(recipeId),
        getUserRecipeRating(event.locals.user!.id, recipeId)
    ]);

    return {
        recipe: {
            ...recipe,
            isFavorite,
            ingredients,
            steps,
            averageRating: ratingSummary.average,
            ratingCount: ratingSummary.count,
            userRating
        }
    };
}
