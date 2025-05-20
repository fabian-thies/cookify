import type {PageServerLoad} from './$types';
import {error} from "@sveltejs/kit";
import type {RecipeResponse} from "$lib/types/recipes";

export const load: PageServerLoad = async ({fetch, params}) => {
    const res = await fetch(`/api/v1/recipes/${params.id}`);

    if (!res.ok) {
        error(500, {
            message: "Ein Fehler ist aufgetreten."
        })
    }

    const data: RecipeResponse = await res.json();

    if (!data.success) {
        error(404, {
            message: "Rezept nicht gefunden."
        })
    }

    return {
        ...data
    }
};