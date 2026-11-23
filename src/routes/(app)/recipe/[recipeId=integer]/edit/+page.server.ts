import {type Actions, fail, type RequestEvent} from "@sveltejs/kit";
import {InvalidRecipeSourceUrlError, parseRecipeFormData} from "$lib/server/utils";
import {deleteImage, ImageUploadError, saveImage, saveImageFromUrl} from "$lib/server/image";
import {getRecipeById, updateRecipe} from "$lib/server/db/recipe";

export const actions = {
    updateRecipe: async ({request, locals, params}: RequestEvent) => {
        // Actions run before layout loads, so the (app) layout guard does not apply here.
        if (!locals.user) {
            return fail(401, {invalid: true, unauthorized: true});
        }

        // Authorize before reading the body or writing an upload, otherwise anyone can
        // fill the disk by posting valid images with someone else's recipe id.
        const recipeId = Number(params.recipeId);
        const existing = await getRecipeById(recipeId);
        if (!existing) {
            return fail(404, {notFound: true});
        }
        if (existing.userId !== locals.user.id) {
            return fail(403, {forbidden: true});
        }

        const formData = await request.formData();
        const pictureEntry = formData.get('picture');
        const picture = pictureEntry instanceof File ? pictureEntry : null;
        const pictureUrl = String(formData.get('pictureUrl') ?? '').trim();

        let data;
        try {
            data = parseRecipeFormData(formData);
        } catch (e) {
            if (e instanceof InvalidRecipeSourceUrlError) {
                return fail(400, {invalid: true, sourceUrlInvalid: true});
            }
            console.error(e);
            return fail(400, {invalid: true});
        }

        let uploadedImage: string | undefined;
        if ((picture && picture.size > 0) || pictureUrl) {
            if (picture && picture.size > 15 * 1024 * 1024) {
                return fail(400, {invalid: true, pictureTooLarge: true});
            }
            try {
                uploadedImage = picture && picture.size > 0
                    ? await saveImage(picture)
                    : await saveImageFromUrl(pictureUrl);
            } catch (e) {
                if (e instanceof ImageUploadError) {
                    return fail(400, {invalid: true, imageInvalid: true});
                }
                console.error('Image save failed', e);
                return fail(500, {internalError: true, imageSaveFailed: true});
            }
        }

        try {
            await updateRecipe({
                id: recipeId,
                userId: locals.user.id,
                ...data,
                image: uploadedImage
            });
        } catch (e) {
            if (uploadedImage) {
                await deleteImage(uploadedImage);
            }

            if(e instanceof Error && e.message === "Insufficient permissions") {
                return fail(403, {forbidden: true});
            }

            console.error(e);
            return fail(500, {internalError: true});
        }

        return {
            success: true,
            id: params.recipeId
        };
    }
} satisfies Actions;
