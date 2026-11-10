import * as v from 'valibot';
import {command, getRequestEvent} from '$app/server';
import {estimateNutritionForRecipe, type AiRecipe} from '$lib/server/ai';
import {isAiAvailable} from '$lib/server/ai/availability';
import {checkAiRateLimit} from '$lib/server/ai/rate-limit';
import {
    getIngredients,
    getRecipeById,
    getSteps,
    getTips,
    updateRecipeNutrition
} from '$lib/server/db/recipe';

export const estimateNutrition = command(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    const {locals} = getRequestEvent();
    const user = locals.user;

    if (!user) {
        throw new Error('User not authenticated');
    }

    if (!await isAiAvailable()) {
        throw new Error('AI is not available');
    }

    if (!checkAiRateLimit(user.id)) {
        throw new Error('Too many AI requests');
    }

    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
        throw new Error('Recipe not found');
    }

    if (recipe.userId !== user.id && !user.administrator) {
        throw new Error('Insufficient permissions');
    }

    const [ingredients, steps, tips] = await Promise.all([
        getIngredients(recipeId),
        getSteps(recipeId),
        getTips(recipeId)
    ]);

    const aiRecipe: AiRecipe = {
        title: recipe.title,
        description: recipe.description,
        image: recipe.image,
        cookTime: recipe.cookingTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty as AiRecipe['difficulty'],
        ingredients: ingredients.map((ingredient) => ({
            name: ingredient.name,
            amount: ingredient.quantity,
            unit: ingredient.unit
        })),
        steps: steps
            .sort((a, b) => a.number - b.number)
            .map((step) => step.step),
        tags: recipe.tags ?? [],
        tips: tips.map((tip) => tip.tip),
        nutrition: null,
        sourceUrl: null
    };

    const nutrition = await estimateNutritionForRecipe(aiRecipe);
    const updated = await updateRecipeNutrition(recipeId, nutrition);

    return updated ?? nutrition;
});
