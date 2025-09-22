import {getDifficulties, getRecipes, getRecipesByUserId} from "$lib/server/db/recipe";
import type {PageServerLoad} from "../../../../../.svelte-kit/types/src/routes/(app)/profile/[id]/$types";

export const load: PageServerLoad = async (event) => {
    const recipes = await getRecipes();
    const difficulties = await getDifficulties();

    return {recipes, difficulties};
}