import type {PageServerLoad} from "./$types";
import {getIngredients, getRecipeById, getRecipeFavoriteState, getSteps} from "$lib/server/db/recipe";
import {error} from "@sveltejs/kit";

export const load: PageServerLoad = async (event) => {
    const recipeId = Number(event.params.recipeId);

    if(Number.isNaN(recipeId)) {
        throw error(400, 'Wrong Recipe-ID');
    }

    const recipe = await getRecipeById(recipeId);

    if(recipe === null) {
        throw error(404, 'Recipe not found')
    }

    const steps = await getSteps(recipeId);
    const ingredients = await getIngredients(recipeId);
    const isFavorite = await getRecipeFavoriteState(event.locals.user!.id, recipeId);

    return {
        recipe: {
            ...recipe,
            isFavorite,
            ingredients,
            steps
        }
    };
}