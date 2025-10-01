import * as v from 'valibot';
import {command, getRequestEvent} from '$app/server';
import {toggleRecipeFavorite, deleteRecipe as deleteRecipeFromDb} from '$lib/server/db/recipe';

export const likeRecipe = command(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    const {locals} = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    return await toggleRecipeFavorite(userId, recipeId);
});

export const deleteRecipe = command(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    const {locals} = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    return await deleteRecipeFromDb(userId, recipeId);
});