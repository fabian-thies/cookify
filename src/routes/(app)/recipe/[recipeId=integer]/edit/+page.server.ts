import type {PageServerLoad} from "./$types";
import {
    getIngredients,
    getRecipeById,
    getSteps,
    getTags,
    updateRecipe
} from "$lib/server/db/recipe";
import {type Actions, error, fail, type RequestEvent} from "@sveltejs/kit";
import {parseRecipeFormData, saveImage} from "$lib/server/utils";

export const load: PageServerLoad = async (event) => {
    const recipeId = Number(event.params.recipeId);

    const recipe = await getRecipeById(Number(event.params.recipeId));
    const ingredients = await getIngredients(recipeId);
    const steps = await getSteps(recipeId);
    const tags = await getTags(recipeId);

    if (!recipe) {
        error(404, {
            message: "Recipe not found",
        })
    }

    return {recipe: {...recipe, ingredients, steps, tags}}
}

export const actions = {
    updateRecipe: async ({request, locals, params}: RequestEvent) => {
        const formData = await request.formData();
        const picture = formData.get('picture') as File | null;

        let data;
        try {
            data = parseRecipeFormData(formData);
        } catch (e) {
            console.error(e);
            return fail(400, {invalid: true});
        }

        let imageUrl: string;
        if (picture && picture.size > 0) {
            if (picture.size > 15 * 1024 * 1024) {
                return fail(400, {invalid: true, pictureTooLarge: true});
            }
            try {
                imageUrl = await saveImage(picture);
            } catch (e) {
                console.error('Image save failed', e);
                return fail(500, {internalError: true, imageSaveFailed: true});
            }
        } else {
            const existing = await getRecipeById(Number(params.recipeId));
            imageUrl = existing?.image ?? "";
        }

        try {
            await updateRecipe({
                id: Number(params.recipeId),
                userId: locals.user!.id,
                ...data,
                image: imageUrl
            });
        } catch (e) {
            console.error(e);
            return fail(500, {internalError: true});
        }

        return {
            success: true,
            id: params.recipeId
        };
    }
} satisfies Actions;
