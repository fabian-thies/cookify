import {type Actions, fail, redirect, type RequestEvent} from "@sveltejs/kit";
import {saveImage, validateInputEmpty} from "$lib/server/utils";
import {createRecipe} from "$lib/server/db/recipe";

export const actions = {
    createRecipe: async ({request, locals}: RequestEvent) => {
        const formData = await request.formData();

        const title: string = formData.get("title")?.toString() ?? "";
        const description: string = formData.get("description")?.toString() ?? "";
        const cookTime: number = Number(formData.get("cookTime"));
        const servings: number = Number(formData.get("servings"));
        const difficulty: string = formData.get("difficulty")?.toString() ?? "";
        const picture = formData.get('picture') as File | null;

        if (!picture || picture.size === 0) {
            return fail(400, { invalid: true, pictureMissing: true });
        }
        if (picture.size > 5 * 1024 * 1024) {
            return fail(400, { invalid: true, pictureTooLarge: true });
        }

        try {
            validateInputEmpty(title, description, cookTime, servings, difficulty);
        } catch (e) {
            console.error(e);

            return fail(400, {invalid: true});
        }

        let imageUrl: string;
        try {
            imageUrl = await saveImage(picture);
        } catch (e) {
            console.error('Image save failed', e);
            return fail(500, { internalError: true, imageSaveFailed: true });
        }

        const amounts: number[] = [];
        const units: string[] = [];
        const name: string[] = [];
        const steps: string[] = [];
        const tags: string[] = [];

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
            name.push(str);
        }

        for (const step of formData.getAll("instructions_description[]")) {
            const str = step.toString();
            if (str.trim() === "") {
                return fail(400, {invalid: true});
            }
            steps.push(str);
        }

        for (const tag of formData.getAll("tags[]")) {
            const str = tag.toString().trim();
            if (str !== "") {
                tags.push(str);
            }
        }

        const ingredientsList = amounts.map((amount, index) => ({
            amount: amount,
            unit: units[index],
            name: name[index]
        }));

        let recipeId;

        try {
            recipeId = await createRecipe({
                title,
                description,
                cookTime,
                servings,
                userId: locals.user!.id,
                difficulty,
                ingredientsList,
                steps,
                tags,
                image: imageUrl
            })
        } catch (e) {
            console.error(e);
            return fail(500, {internalError: true});
        }

        throw redirect(302, '/recipe/' + recipeId[0].id);
    }
} satisfies Actions;