import type {PageServerLoad} from "./$types";
import {
    getIngredients,
    getRecipeById,
    getRecipeFavoriteState,
    getSteps,
    getTags,
    updateRecipe
} from "$lib/server/db/recipe";
import {type Actions, error, fail, redirect, type RequestEvent} from "@sveltejs/kit";
import {saveImage, validateInputEmpty} from "$lib/server/utils";

export const load: PageServerLoad = async (event) => {
    const recipeId = Number(event.params.recipeId);

    const recipe = await getRecipeById(Number(event.params.recipeId));
    const ingredients = await getIngredients(recipeId);
    const steps = await getSteps(recipeId);
    const tags = await getTags(recipeId);

    if(!recipe) {
        error(404, {
            message: "Recipe not found",
        })
    }

    return {recipe: {...recipe, ingredients, steps, tags}}
}

export const actions = {
    updateRecipe: async ({request, locals, params}: RequestEvent) => {
        const formData = await request.formData();

        const title: string = formData.get("title")?.toString() ?? "";
        const description: string = formData.get("description")?.toString() ?? "";
        const cookTime: number = Number(formData.get("cookTime"));
        const servings: number = Number(formData.get("servings"));
        const difficulty: string = formData.get("difficulty")?.toString() ?? "";
        const picture = formData.get('picture') as File | null;

        try {
            validateInputEmpty(title, description, cookTime, servings, difficulty);
        } catch (e) {
            console.error(e);

            return fail(400, {invalid: true});
        }

        let imageUrl: string;
        if (picture && picture.size > 0) {
            if (picture.size > 5 * 1024 * 1024) {
                return fail(400, { invalid: true, pictureTooLarge: true });
            }
            try {
                imageUrl = await saveImage(picture);
            } catch (e) {
                console.error('Image save failed', e);
                return fail(500, { internalError: true, imageSaveFailed: true });
            }
        } else {
            const existing = await getRecipeById(Number(params.recipeId));
            imageUrl = existing?.image ?? "";
        }

        const amounts: number[] = [];
        const units: string[] = [];
        const names: string[] = [];
        const stepsArr: string[] = [];
        const tagsArr: string[] = [];

        for (const amount of formData.getAll("ingredients_amount[]")) {
            const num = Number(amount);
            if (Number.isNaN(num)) {
                return fail(400, {invalid: true});
            }
            amounts.push(num);
        }

        for (const unit of formData.getAll("ingredients_unit[]")) {
            const str = unit.toString();
            if (str.trim() === "") {
                return fail(400, {invalid: true});
            }
            units.push(str);
        }

        for (const ingredient of formData.getAll("ingredients_name[]")) {
            const str = ingredient.toString();
            if (str.trim() === "") {
                return fail(400, {invalid: true});
            }
            names.push(str);
        }

        for (const step of formData.getAll("instructions_description[]")) {
            const str = step.toString();
            if (str.trim() === "") {
                return fail(400, {invalid: true});
            }
            stepsArr.push(str);
        }

        for (const tag of formData.getAll("tags[]")) {
            const str = tag.toString().trim();
            if (str !== "") {
                tagsArr.push(str);
            }
        }

        const ingredientsList = amounts.map((amount, index) => ({
            amount: amount,
            unit: units[index],
            name: names[index]
        }));

        try {
            await updateRecipe({
                id: Number(params.recipeId),
                title,
                description,
                cookTime,
                servings,
                userId: locals.user!.id,
                difficulty,
                ingredientsList,
                steps: stepsArr,
                tags: tagsArr,
                image: imageUrl
            });
        } catch (e) {
            console.error(e);
            return fail(500, {internalError: true});
        }

        throw redirect(302, '/recipe/' + params.recipeId);
    }
} satisfies Actions;
