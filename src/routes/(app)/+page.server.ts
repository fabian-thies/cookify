import type {PageServerLoad} from "./$types";
import {getRecentRecipes, getRecipes} from "$lib/server/db/recipe";

export const load: PageServerLoad = async (event) => {
    const recentRecipes = await getRecentRecipes();

    return {recentRecipes};
}