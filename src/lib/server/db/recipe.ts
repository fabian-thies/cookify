import {db} from "$lib/server/db/index";
import {difficultyToRecipe, ingredients, recipes, steps as stepsTable} from "$lib/server/db/schema";
import {getDifficultyId} from "$lib/server/utils";

export async function createRecipe({
                                       title,
                                       description,
                                       cookTime,
                                       servings,
                                       userId,
                                       difficulty,
                                       ingredientsList,
                                       steps
                                   }: CreateRecipeInput) {
    const result = await db.insert(recipes).values({
        title,
        description,
        image: "",
        cookingTime: cookTime,
        servings,
        userId: userId
    }).returning({id: recipes.id});

    await db.insert(difficultyToRecipe).values({recipeId: result[0].id, difficultyId: getDifficultyId(difficulty)});

    for (const ingredient of ingredientsList) {
        await db.insert(ingredients).values({
            recipeId: result[0].id,
            name: ingredient.name,
            quantity: ingredient.amount,
            unit: ingredient.unit
        })
    }
    for (const step of steps) {
        await db.insert(stepsTable).values({recipeId: result[0].id, step: step, number: steps.indexOf(step) + 1})
    }
}