import * as v from 'valibot';
import {command, getRequestEvent, query} from '$app/server';
import {
    toggleRecipeFavorite,
    deleteRecipe as deleteRecipeFromDb,
    upsertRecipeRating,
    getCollections as getCollectionsFromDb
} from '$lib/server/db/recipe';

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

export const rateRecipe = command(v.object({
    recipeId: v.number(),
    rating: v.pipe(
        v.number(),
        v.minValue(1),
        v.maxValue(5)
    )
}), async ({recipeId, rating}) => {
    const {locals} = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    const summary = await upsertRecipeRating(userId, recipeId, rating);

    return {
        average: summary.average,
        count: summary.count,
        rating,
    };
});

export const getCollections = query(async () => {
    return getCollectionsFromDb();
});