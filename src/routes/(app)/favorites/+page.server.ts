import {type Actions, fail, redirect} from "@sveltejs/kit";
import * as auth from "$lib/server/auth";
import type {PageServerLoad} from "./$types";
import {getDifficulties, getFavoriteRecipes} from "$lib/server/db/recipe";

export const load: PageServerLoad = async (event) => {
    const recipes = await getFavoriteRecipes();
    const difficulties = await getDifficulties();

    return {recipes, difficulties};
}