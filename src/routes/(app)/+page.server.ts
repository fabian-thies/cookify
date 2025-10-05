import type {PageServerLoad} from "./$types";
import {getPopularRecipes, getRecentRecipes, getRecipes} from "$lib/server/db/recipe";

export const load: PageServerLoad = async (event) => {
    const recentRecipes = await getRecentRecipes();
    const popularRecipes = await getPopularRecipes();

    return {recentRecipes, popularRecipes};
}