import type {PageServerLoad} from "./$types";
import {getIngredients, getRecipeById, getRecipeFavoriteState, getSteps} from "$lib/server/db/recipe";
import {error} from "@sveltejs/kit";

export const load: PageServerLoad = async (event) => {

}