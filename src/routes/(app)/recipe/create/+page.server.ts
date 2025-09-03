import {type Actions, fail, type RequestEvent} from "@sveltejs/kit";
import {getDifficultyId, validateInputEmpty} from "$lib/server/utils";
import { db } from '$lib/server/db';
import {difficultyToRecipe, ingredients, recipes, steps as stepsTable} from "$lib/server/db/schema";

export const actions = {
    createRecipe: async ({request, locals}: RequestEvent) => {
        const formData = await request.formData();

        const title: string = formData.get("title")?.toString() ?? "";
        const description: string = formData.get("description")?.toString() ?? "";
        const cookTime: number = Number(formData.get("cookTime"));
        const servings: number = Number(formData.get("servings"));
        const difficulty: string = formData.get("difficulty")?.toString() ?? "";

        const amounts: number[] = [];
        const units: string[] = [];
        const name: string[] = [];
        const steps: string[] = [];

        console.log("locals.user!.id")
        console.log(locals.user)
        console.log("locals.user")

        try {
            validateInputEmpty(title, description, cookTime, servings, difficulty);
        } catch (e) {
            console.error(e);

            return fail(400, {invalid: true});
        }

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

        const ingredientsList = amounts.map((amount, index) => ({
            amount: amount,
            unit: units[index],
            name: name[index]
        }));

        try {
            const result = await db.insert(recipes).values({ title, description, image: "", cookingTime: cookTime, servings, userId: locals.user!.id }).returning({ id: recipes.id });

            console.log('Difficulty value:', difficulty);

            await db.insert(difficultyToRecipe).values({recipeId: result[0].id, difficultyId: getDifficultyId(difficulty)});

            for (const ingredient of ingredientsList) {
                await db.insert(ingredients).values({recipeId: result[0].id, name: ingredient.name, quantity: ingredient.amount, unit: ingredient.unit})
            }
            for (const step of steps) {
                await db.insert(stepsTable).values({recipeId: result[0].id, step: step, number: steps.indexOf(step) + 1})
            }

        } catch (e) {
            console.error(e);
            return fail(500, {internalError: true});
        }

        return {
            success: true
        }
    }
} satisfies Actions;