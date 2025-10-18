import {type Actions, fail, redirect, type RequestEvent} from "@sveltejs/kit";
import {parseRecipeFormData, saveImage, validateInputEmpty} from "$lib/server/utils";
import {createRecipe} from "$lib/server/db/recipe";

export const actions = {
    createRecipe: async ({request, locals}: RequestEvent) => {
        const formData = await request.formData();

        const picture = formData.get('picture') as File | null;

        if (!picture || picture.size === 0) {
            return fail(400, {invalid: true, pictureMissing: true});
        }
        if (picture.size > 15 * 1024 * 1024) {
            return fail(400, {invalid: true, pictureTooLarge: true});
        }

        let data;
        try {
            data = parseRecipeFormData(formData);
        } catch (e) {
            console.error(e);
            return fail(400, {invalid: true});
        }

        let imageUrl: string;
        try {
            imageUrl = await saveImage(picture);
        } catch (e) {
            console.error('Image save failed', e);
            return fail(500, {internalError: true, imageSaveFailed: true});
        }

        let recipeId;

        try {
            recipeId = await createRecipe({
                ...data,
                userId: locals.user!.id,
                image: imageUrl
            })
        } catch (e) {
            console.error(e);
            return fail(500, {internalError: true});
        }

        console.log(recipeId)

        return {
            success: true,
            id: recipeId[0].id,
        }
    }
} satisfies Actions;