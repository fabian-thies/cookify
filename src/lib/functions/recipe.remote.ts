import * as v from 'valibot';
import {command, getRequestEvent} from '$app/server';
import {toggleRecipeFavorite} from "$lib/server/db/recipe";

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