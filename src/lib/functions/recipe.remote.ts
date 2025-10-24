import * as v from 'valibot';
import {command, getRequestEvent, query} from '$app/server';
import {
    toggleRecipeFavorite,
    deleteRecipe as deleteRecipeFromDb,
    upsertRecipeRating,
    getCollections as getCollectionsFromDb, createCollectionInDb,
    toggleRecipeInCollection as toggleRecipeInCollectionInDb,
    setCollectionTitle as setCollectionTitleInDb
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
    const {locals} = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    return getCollectionsFromDb(userId);
});

export const setCollectionTitle = command(v.object({
    title: v.string()
}), async ({title}) => {
    if (!title) {
        throw new Error('Collection title is required');
    }

    return(setCollectionTitleInDb(title));
});

export const getCollectionsForRecipe = query(async () => {
    const {locals, params} = getRequestEvent();
    const userId = locals.user?.id;
    const recipeId = Number(params.recipeId);

    if (!userId) {
        throw new Error('User not authenticated');
    }

    if (!recipeId) {
        throw new Error('Recipe ID not provided');
    }

    return getCollectionsFromDb(userId, recipeId);
});

export const toggleRecipeInCollection = command(v.object({
    collectionId: v.number()
}), async ({collectionId}) => {
    const {locals, params} = getRequestEvent();

    if (!params.recipeId) {
        throw new Error('Recipe ID not provided');
    }

    if (!collectionId) {
        throw new Error('Collection ID not provided');
    }

    return toggleRecipeInCollectionInDb(Number(params.recipeId), collectionId);
});

export const createCollection = command(v.object({
    title: v.pipe(
        v.string(),
        v.minLength(1),
        v.maxLength(100)
    )
}), async ({title}) => {
    const {locals, params} = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    if(!params.recipeId) {
        throw new Error('Recipe ID not provided');
    }

    return createCollectionInDb(userId, title, Number(params.recipeId));
});