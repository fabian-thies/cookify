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
    const isAdmin = event.locals.user?.administrator;
    const isOwner = recipe.userId === viewerId || !!isAdmin;

    if (recipe.visibility === "private" && !isOwner) {
        throw error(403, 'Recipe is private');
    }

    await incrementRecipeViewCount(recipeId);
    const sharePath = isOwner && recipe.shareEnabled && recipe.shareToken ? `/share/${recipe.shareToken}` : null;
    const {shareToken, ...recipeWithoutToken} = recipe;

    const [steps, ingredients, isFavorite, ratingSummary, userRating] = await Promise.all([
        getSteps(recipeId),
        getIngredients(recipeId),
        getRecipeFavoriteState(event.locals.user!.id, recipeId),
        getRecipeRatingSummary(recipeId),
        getUserRecipeRating(event.locals.user!.id, recipeId)
    ]);

    return {
        recipe: {
            ...recipeWithoutToken,
            sharePath,
            isFavorite,
            ingredients,
            steps,
            averageRating: ratingSummary.average,
            ratingCount: ratingSummary.count,
            userRating
        }
    };
}
