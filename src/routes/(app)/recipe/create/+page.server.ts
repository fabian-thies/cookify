import {type Actions, fail, redirect, type RequestEvent} from "@sveltejs/kit";
import {parseRecipeFormData, validateInputEmpty} from "$lib/server/utils";
import {deleteImage, ImageUploadError, saveImage} from "$lib/server/image";
import {createRecipe} from "$lib/server/db/recipe";

export const actions = {
    createRecipe: async ({request, locals}: RequestEvent) => {
        // Actions run before layout loads, so the (app) layout guard does not apply here.
        if (!locals.user) {
            return fail(401, {invalid: true, unauthorized: true});
        }

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
            if (e instanceof ImageUploadError) {
                return fail(400, {invalid: true, imageInvalid: true});
            }
            console.error('Image save failed', e);
            return fail(500, {internalError: true, imageSaveFailed: true});
        }

        let recipeId;

        try {
            recipeId = await createRecipe({
                ...data,
                userId: locals.user.id,
                image: imageUrl
            })
        } catch (e) {
            // Do not leave an orphaned upload behind when the recipe could not be created.
            await deleteImage(imageUrl);
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