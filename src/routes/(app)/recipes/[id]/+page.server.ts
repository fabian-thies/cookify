import type {Actions, PageServerLoad} from './$types';
import {error, fail} from "@sveltejs/kit";
import type {RecipeResponse} from "$lib/types/recipes";
import type {Recipe} from "$lib/server/db/schema";
import {getRecipe} from "$lib/server/services/recipe";

export const load: PageServerLoad = async ({fetch, params, locals}) => {
    const res = await fetch(`/api/v1/recipes/${params.id}`);

    if (!res.ok) {
        error(500, {
            message: "Ein Fehler ist aufgetreten."
        })
    }

    const data: RecipeResponse = await res.json();

    const recipe: Recipe = await getRecipe(Number(params.id));

    if (!data.success) {
        error(404, {
            message: "Rezept nicht gefunden."
        })
    }

    // Check if recipe is saved for current user
    let isSaved = false;
    if (locals.user) {
        try {
            const savedRes = await fetch(`/api/v1/recipes/saved-status`);
            if (savedRes.ok) {
                const savedData = await savedRes.json();
                isSaved = savedData.saved.some(
                    (saved: any) => saved.recipeId === parseInt(params.id)
                );
            }
        } catch (err) {
            console.error('Error checking saved status:', err);
        }
    }

    return {
        recipe: recipe,
        isSaved
    }
};

export const actions: Actions = {
    toggleFavorite: async ({ fetch, params }) => {
        try {
            const res = await fetch(`/api/v1/recipes/${params.id}/save`, {
                method: 'POST'
            });

            if (!res.ok) {
                return fail(res.status, { 
                    success: false, 
                    message: "Error saving recipe."
                });
            }

            return { success: true };
        } catch (err) {
            console.error('Error toggling favorite:', err);
            return fail(500, { 
                success: false, 
                message: "Error toggling favorite."
            });
        }
    }
};
