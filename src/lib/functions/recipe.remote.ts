import * as v from 'valibot';
import {command} from '$app/server';
import {toggleRecipeFavorite} from "$lib/server/db/recipe";

export const likeRecipe = command(v.object({
    userId: v.string(),
    recipeId: v.number()
}), async ({userId, recipeId}) => {
    return await toggleRecipeFavorite(userId, recipeId);
});