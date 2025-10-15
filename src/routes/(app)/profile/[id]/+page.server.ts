import {getDifficulties, getRecipes, getRecipesByUserId} from "$lib/server/db/recipe";
import type {PageServerLoad} from "./$types";

export const load: PageServerLoad = async (event) => {
    const recipes = await getRecipes();
    const difficulties = await getDifficulties();

    return {recipes, difficulties};
}