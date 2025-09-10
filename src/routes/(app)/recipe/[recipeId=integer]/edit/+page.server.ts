import type {PageServerLoad} from "./$types";
import {getIngredients, getRecipeById, getRecipeFavoriteState, getSteps} from "$lib/server/db/recipe";
import {error} from "@sveltejs/kit";

export const load: PageServerLoad = async (event) => {
    const recipeId = Number(event.params.recipeId);

    const recipe = await getRecipeById(Number(event.params.recipeId));
    const ingredients = await getIngredients(recipeId);
    const steps = await getSteps(recipeId);

    if(!recipe) {
        error(404, {
            message: "Recipe not found"
        })
    }

    return {recipe: {...recipe, ingredients, steps}}
}