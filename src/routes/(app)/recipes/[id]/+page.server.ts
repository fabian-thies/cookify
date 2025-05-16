import type {PageServerLoad} from './$types';
import {error} from "@sveltejs/kit";
import type {Recipe} from "$lib/server/db/schema";

export const load: PageServerLoad = async ({fetch, url, params}) => {
    const res = await fetch(`/api/recipes/${params.id}`);

    if(!res.ok) {
        error(500, {
            message: "Ein Fehler ist aufgetreten."
        })
    }

    const recipeFetchResult = await res.json() as {
        success: boolean;
        recipe: Recipe;
    };

    if(!recipeFetchResult.recipe) {
        error(404, {
            message: "Rezept nicht gefunden."
        })
    }

    return {
        recipe: recipeFetchResult.recipe
    }
};