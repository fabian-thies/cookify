import * as v from 'valibot';
import {command, getRequestEvent, query} from '$app/server';
import {
    toggleRecipeFavorite,
    deleteRecipe as deleteRecipeFromDb,
    upsertRecipeRating,
    getCollections as getCollectionsFromDb,
    createCollection as createCollectionInDb,
    toggleRecipeInCollection as toggleRecipeInCollectionInDb,
    setCollectionTitle as setCollectionTitleInDb,
    deleteCollection as deleteCollectionFromDb,
    enableRecipeShare as enableRecipeShareInDb,
    disableRecipeShare as disableRecipeShareInDb,
    getRecipes as getRecipesFromDb,
    getRecentRecipes as getRecentRecipesFromDb,
    getPopularRecipes as getPopularRecipesFromDb,
    getFavoriteRecipes as getFavoriteRecipesFromDb,
    getDifficulties as getDifficultiesFromDb,
    getRecipeById as getRecipeByIdFromDb,
    getRecipeByShareToken as getRecipeByShareTokenFromDb,
    getRecipesByUserId as getRecipesByUserIdFromDb,
    getSteps as getStepsFromDb,
    getIngredients as getIngredientsFromDb,
    getTags as getTagsFromDb,
    getRecipeFavoriteState as getRecipeFavoriteStateFromDb,
    getRecipeRatingSummary as getRecipeRatingSummaryFromDb,
    getUserRecipeRating as getUserRecipeRatingFromDb,
    getCollectionRecipes as getCollectionRecipesFromDb,
    createRecipe as createRecipeInDb,
    updateRecipe as updateRecipeInDb,
    incrementRecipeViewCount
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

export const deleteCollection = command(v.object({
    collectionId: v.number()
}), async ({collectionId}) => {
    return await deleteCollectionFromDb(collectionId);
});

export const getCollections = query(async () => {
    const {locals} = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    return getCollectionsFromDb(userId, undefined, 4);
});

export const setCollectionTitle = command(v.object({
    title: v.string(),
    collectionId: v.number()
}), async ({title, collectionId}) => {
    if (!title) {
        throw new Error('Collection title is required');
    }

    if(!collectionId) {
        throw new Error('Collection ID is required');
    }

    return(setCollectionTitleInDb(collectionId, title));
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

export const enableRecipeShare = command(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    const {locals} = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    return enableRecipeShareInDb(userId, recipeId);
});

export const disableRecipeShare = command(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    const {locals} = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    return disableRecipeShareInDb(userId, recipeId);
});

export const getRecipes = query(v.optional(v.object({
    offset: v.optional(v.number(), 0),
    limit: v.optional(v.number()),
    orderBy: v.optional(v.picklist(['recent', 'popular'])),
    includePrivate: v.optional(v.boolean(), false)
})), async (params) => {
    const {offset = 0, limit, orderBy, includePrivate = false} = params || {};
    return await getRecipesFromDb(offset, limit, orderBy, includePrivate);
});

export const getRecentRecipes = query(async () => {
    return await getRecentRecipesFromDb();
});

export const getPopularRecipes = query(async () => {
    return await getPopularRecipesFromDb();
});

export const getFavoriteRecipes = query(async () => {
    const {locals} = getRequestEvent();
    if (!locals.user) throw new Error('User not authenticated');
    return await getFavoriteRecipesFromDb();
});

export const getDifficulties = query(async () => {
    return await getDifficultiesFromDb();
});

export const getRecipeById = query(v.object({
    id: v.number(),
    incrementView: v.optional(v.boolean(), false)
}), async ({id, incrementView}) => {
    const {locals} = getRequestEvent();
    const recipe = await getRecipeByIdFromDb(id);

    if (!recipe) {
        throw new Error('Recipe not found');
    }

    const viewerId = locals.user?.id;
    const isAdmin = locals.user?.administrator;
    const isOwner = recipe.userId === viewerId || !!isAdmin;

    if (recipe.visibility === "private" && !isOwner) {
        throw new Error('Recipe is private');
    }

    if (incrementView) {
        await incrementRecipeViewCount(id);
    }

    return recipe;
});

export const getRecipeByShareToken = query(v.object({
    token: v.string(),
    incrementView: v.optional(v.boolean(), false)
}), async ({token, incrementView}) => {
    const recipe = await getRecipeByShareTokenFromDb(token);

    if (!recipe) {
        throw new Error('Recipe not found or share link inactive');
    }

    if (incrementView) {
        await incrementRecipeViewCount(recipe.id);
    }

    return recipe;
});

export const getRecipesByUserId = query(v.object({
    userId: v.string(),
    includePrivate: v.optional(v.boolean(), false)
}), async ({userId, includePrivate}) => {
    return await getRecipesByUserIdFromDb(userId, includePrivate);
});

export const getSteps = query(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    return await getStepsFromDb(recipeId);
});

export const getIngredients = query(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    return await getIngredientsFromDb(recipeId);
});

export const getTags = query(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    return await getTagsFromDb(recipeId);
});

export const getRecipeFavoriteState = query(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    const {locals} = getRequestEvent();
    if (!locals.user) throw new Error('User not authenticated');
    return await getRecipeFavoriteStateFromDb(locals.user.id, recipeId);
});

export const getRecipeRatingSummary = query(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    return await getRecipeRatingSummaryFromDb(recipeId);
});

export const getUserRecipeRating = query(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    const {locals} = getRequestEvent();
    if (!locals.user) throw new Error('User not authenticated');
    return await getUserRecipeRatingFromDb(locals.user.id, recipeId);
});

export const getCollectionRecipes = query(v.object({
    collectionId: v.number()
}), async ({collectionId}) => {
    return await getCollectionRecipesFromDb(collectionId);
});

export const getRecipeDetails = query(v.object({
    recipeId: v.number(),
    incrementView: v.optional(v.boolean(), false)
}), async ({recipeId, incrementView}) => {
    const {locals} = getRequestEvent();
    const recipe = await getRecipeByIdFromDb(recipeId);

    if (!recipe) {
        throw new Error('Recipe not found');
    }

    const viewerId = locals.user?.id;
    const isAdmin = locals.user?.administrator;
    const isOwner = recipe.userId === viewerId || !!isAdmin;

    if (recipe.visibility === "private" && !isOwner) {
        throw new Error('Recipe is private');
    }

    if (incrementView) {
        await incrementRecipeViewCount(recipeId);
    }

    const sharePath = isOwner && recipe.shareEnabled && recipe.shareToken ? `/share/${recipe.shareToken}` : null;
    const {shareToken, ...recipeWithoutToken} = recipe;

    const [steps, ingredients, ratingSummary] = await Promise.all([
        getStepsFromDb(recipeId),
        getIngredientsFromDb(recipeId),
        getRecipeRatingSummaryFromDb(recipeId)
    ]);

    let isFavorite = false;
    let userRating = null;

    if (locals.user) {
        [isFavorite, userRating] = await Promise.all([
            getRecipeFavoriteStateFromDb(locals.user.id, recipeId),
            getUserRecipeRatingFromDb(locals.user.id, recipeId)
        ]);
    }

    return {
        ...recipeWithoutToken,
        sharePath,
        isFavorite,
        ingredients,
        steps,
        averageRating: ratingSummary.average,
        ratingCount: ratingSummary.count,
        userRating
    };
});

export const getRecipeForEdit = query(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    const {locals} = getRequestEvent();
    const recipe = await getRecipeByIdFromDb(recipeId);

    if (!recipe) {
        throw new Error('Recipe not found');
    }

    if (recipe.userId !== locals.user?.id) {
        throw new Error('You do not have permission to edit this recipe');
    }

    const [ingredients, steps, tags] = await Promise.all([
        getIngredientsFromDb(recipeId),
        getStepsFromDb(recipeId),
        getTagsFromDb(recipeId)
    ]);

    return {
        ...recipe,
        ingredients,
        steps,
        tags
    };
});

export const getSharedRecipeDetails = query(v.object({
    token: v.string(),
    incrementView: v.optional(v.boolean(), false)
}), async ({token, incrementView}) => {
    const recipe = await getRecipeByShareTokenFromDb(token);

    if (!recipe) {
        throw new Error('Recipe not found or share link inactive');
    }

    if (incrementView) {
        await incrementRecipeViewCount(recipe.id);
    }

    const [steps, ingredients, ratingSummary] = await Promise.all([
        getStepsFromDb(recipe.id),
        getIngredientsFromDb(recipe.id),
        getRecipeRatingSummaryFromDb(recipe.id)
    ]);

    return {
        ...recipe,
        ingredients,
        steps,
        averageRating: ratingSummary.average,
        ratingCount: ratingSummary.count,
        userRating: null,
        isFavorite: false,
        sharePath: `/share/${token}`,
        shareEnabled: true
    };
});

export const createRecipe = command(v.object({
    title: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
    description: v.pipe(v.string(), v.minLength(1)),
    cookTime: v.pipe(v.number(), v.minValue(1)),
    servings: v.pipe(v.number(), v.minValue(1)),
    difficulty: v.picklist(['easy', 'medium', 'hard']),
    ingredientsList: v.array(v.object({
        name: v.pipe(v.string(), v.minLength(1)),
        amount: v.number(),
        unit: v.pipe(v.string(), v.minLength(1))
    })),
    steps: v.array(v.pipe(v.string(), v.minLength(1))),
    tags: v.array(v.pipe(v.string(), v.minLength(1))),
    image: v.pipe(v.string(), v.minLength(1)),
    visibility: v.picklist(['public', 'private'])
}), async (data) => {
    const {locals} = getRequestEvent();

    if (!locals.user) {
        throw new Error('User not authenticated');
    }

    return await createRecipeInDb({
        ...data,
        userId: locals.user.id
    });
});

export const updateRecipe = command(v.object({
    id: v.number(),
    title: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
    description: v.pipe(v.string(), v.minLength(1)),
    cookTime: v.pipe(v.number(), v.minValue(1)),
    servings: v.pipe(v.number(), v.minValue(1)),
    difficulty: v.picklist(['easy', 'medium', 'hard']),
    ingredientsList: v.array(v.object({
        name: v.pipe(v.string(), v.minLength(1)),
        amount: v.number(),
        unit: v.pipe(v.string(), v.minLength(1))
    })),
    steps: v.array(v.pipe(v.string(), v.minLength(1))),
    tags: v.array(v.pipe(v.string(), v.minLength(1))),
    image: v.pipe(v.string(), v.minLength(1)),
    visibility: v.picklist(['public', 'private'])
}), async (data) => {
    const {locals} = getRequestEvent();

    if (!locals.user) {
        throw new Error('User not authenticated');
    }

    return await updateRecipeInDb({
        ...data,
        userId: locals.user.id
    });
});
