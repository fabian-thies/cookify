import * as v from 'valibot';
import {and, eq} from 'drizzle-orm';
import {error} from '@sveltejs/kit';
import {getDb} from '$lib/server/db';
import {recipeNotes} from '$lib/server/db/schema';
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
    getDiscoverRecipes as getDiscoverRecipesFromDb,
    getForYouRecipes as getForYouRecipesFromDb,
    getFavoriteRecipes as getFavoriteRecipesFromDb,
    getDifficulties as getDifficultiesFromDb,
    getRecipeById as getRecipeByIdFromDb,
    getRecipeByShareToken as getRecipeByShareTokenFromDb,
    getRecipesByUserId as getRecipesByUserIdFromDb,
    getSteps as getStepsFromDb,
    getIngredients as getIngredientsFromDb,
    getTags as getTagsFromDb,
    getTips as getTipsFromDb,
    getRecipeFavoriteState as getRecipeFavoriteStateFromDb,
    getRecipeRatingSummary as getRecipeRatingSummaryFromDb,
    getUserRecipeRating as getUserRecipeRatingFromDb,
    getCollectionRecipes as getCollectionRecipesFromDb,
    searchRecipes as searchRecipesFromDb,
    searchRecipesByIngredients,
    incrementRecipeViewCount,
    recordRecipeCooked as recordRecipeCookedInDb,
    getSimilarRecipes as getSimilarRecipesFromDb
} from '$lib/server/db/recipe';

const MAX_INT32 = 2_147_483_647;
const positiveInt = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(MAX_INT32));

function requireAuth() {
    const {locals} = getRequestEvent();
    if (!locals.user) {
        throw new Error('User not authenticated');
    }
    return locals.user;
}

export const likeRecipe = command(v.object({
    recipeId: positiveInt
}), async ({recipeId}) => {
    const user = requireAuth();
    await assertRecipeVisible(recipeId);

    return await toggleRecipeFavorite(user.id, recipeId);
});

export const deleteRecipe = command(v.object({
    recipeId: positiveInt
}), async ({recipeId}) => {
    const user = requireAuth();

    return await deleteRecipeFromDb(user.id, recipeId);
});

export const rateRecipe = command(v.object({
    recipeId: positiveInt,
    rating: v.pipe(
        v.number(),
        v.integer(),
        v.minValue(1),
        v.maxValue(5)
    )
}), async ({recipeId, rating}) => {
    const user = requireAuth();
    await assertRecipeVisible(recipeId);

    const summary = await upsertRecipeRating(user.id, recipeId, rating);

    return {
        average: summary.average,
        count: summary.count,
        rating,
    };
});

export const deleteCollection = command(v.object({
    collectionId: positiveInt
}), async ({collectionId}) => {
    requireAuth();
    return await deleteCollectionFromDb(collectionId);
});

export const getCollections = query(async () => {
    const user = requireAuth();

    return getCollectionsFromDb(user.id, undefined, 4);
});

export const setCollectionTitle = command(v.object({
    title: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
    collectionId: positiveInt
}), async ({title, collectionId}) => {
    requireAuth();

    return setCollectionTitleInDb(collectionId, title);
});

function parsePositiveInt(value: string | undefined): number | undefined {
    if (!value || !/^\d+$/.test(value)) {
        return undefined;
    }

    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_INT32) {
        return undefined;
    }

    return parsed;
}

export const getCollectionsForRecipe = query(async () => {
    const {locals, params} = getRequestEvent();
    const userId = locals.user?.id;
    const recipeId = parsePositiveInt(params.recipeId);

    if (!userId) {
        throw new Error('User not authenticated');
    }

    if (recipeId === undefined) {
        throw new Error('Recipe ID not provided');
    }

    await assertRecipeVisible(recipeId);

    return getCollectionsFromDb(userId, recipeId);
});

export const toggleRecipeInCollection = command(v.object({
    collectionId: positiveInt
}), async ({collectionId}) => {
    const {locals, params} = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    const recipeId = parsePositiveInt(params.recipeId);
    if (recipeId === undefined) {
        throw new Error('Recipe ID not provided');
    }

    await assertRecipeVisible(recipeId);

    return toggleRecipeInCollectionInDb(userId, recipeId, collectionId);
});

export const createCollection = command(v.object({
    title: v.pipe(
        v.string(),
        v.trim(),
        v.minLength(1),
        v.maxLength(100)
    )
}), async ({title}) => {
    const {locals, params} = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    const recipeId = parsePositiveInt(params.recipeId);
    if (recipeId !== undefined) {
        await assertRecipeVisible(recipeId);
    }

    return createCollectionInDb(userId, title, recipeId);
});

export const enableRecipeShare = command(v.object({
    recipeId: positiveInt
}), async ({recipeId}) => {
    const {locals} = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    return enableRecipeShareInDb(userId, recipeId);
});

export const disableRecipeShare = command(v.object({
    recipeId: positiveInt
}), async ({recipeId}) => {
    const {locals} = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    return disableRecipeShareInDb(userId, recipeId);
});

const DEFAULT_RECIPE_PAGE_SIZE = 24;
const recipeSortSchema = v.picklist(['recent', 'rating', 'cookTime', 'lastCooked']);
const recipeOrderBySchema = v.picklist(['recent', 'popular', 'rating', 'cookTime', 'lastCooked']);
const recipeCookTimeSchema = v.picklist(['0-15', '15-30', '30-60', '60+']);
const recipeDifficultySchema = v.picklist(['easy', 'medium', 'hard']);
const recipeAuthorSchema = v.picklist(['all', 'user']);

export const getRecipes = query(v.optional(v.object({
    offset: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100_000)), 0),
    limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)), DEFAULT_RECIPE_PAGE_SIZE),
    orderBy: v.optional(recipeOrderBySchema),
    difficulty: v.optional(recipeDifficultySchema),
    cookTime: v.optional(recipeCookTimeSchema),
    tag: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100))),
    author: v.optional(recipeAuthorSchema)
})), async (params) => {
    const {offset = 0, limit = DEFAULT_RECIPE_PAGE_SIZE, orderBy, difficulty, cookTime, tag, author} = params || {};
    const {locals} = getRequestEvent();
    if (!locals.user) throw new Error('User not authenticated');
    return await getRecipesFromDb(offset, limit, orderBy, locals.user.id, {
        difficulty,
        cookTime,
        tag,
        author
    });
});

export const searchRecipes = query(v.object({
    query: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
    ingredientsOnly: v.optional(v.boolean(), false),
    orderBy: v.optional(recipeSortSchema),
}), async ({query, ingredientsOnly, orderBy}) => {
    const {locals} = getRequestEvent();
    if (!locals.user) throw new Error('User not authenticated');
    return ingredientsOnly
        ? searchRecipesByIngredients(query, locals.user.id, orderBy)
        : searchRecipesFromDb(query, locals.user.id, 60, orderBy);
});

export const getRecentRecipes = query(async () => {
    requireAuth();
    return await getRecentRecipesFromDb();
});

export const getPopularRecipes = query(async () => {
    requireAuth();
    return await getPopularRecipesFromDb();
});

export const getDiscoverRecipes = query(async () => {
    requireAuth();
    return await getDiscoverRecipesFromDb();
});

export const getForYouRecipes = query(async () => {
    const user = requireAuth();
    return await getForYouRecipesFromDb(user.id);
});

export const recordRecipeCooked = command(v.object({
    recipeId: positiveInt
}), async ({recipeId}) => {
    const user = requireAuth();
    await recordRecipeCookedInDb(user.id, recipeId);
});

export const getFavoriteRecipes = query(v.optional(v.object({
    orderBy: v.optional(recipeSortSchema)
})), async (params) => {
    const user = requireAuth();
    return await getFavoriteRecipesFromDb(user.id, params?.orderBy);
});

export const getDifficulties = query(async () => {
    requireAuth();
    return await getDifficultiesFromDb();
});

export const getRecipeById = query(v.object({
    id: positiveInt,
    incrementView: v.optional(v.boolean(), false)
}), async ({id, incrementView}) => {
    const recipe = await assertRecipeVisible(id);

    if (incrementView) {
        await incrementRecipeViewCount(id);
    }

    const {shareToken: _shareToken, ...recipeWithoutToken} = recipe;
    return recipeWithoutToken;
});

export const getRecipeByShareToken = query(v.object({
    token: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
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
    userId: v.pipe(v.string(), v.minLength(1), v.maxLength(128))
}), async ({userId}) => {
    const user = requireAuth();
    const isOwner = user.id === userId;
    const isAdmin = user.administrator;
    return await getRecipesByUserIdFromDb(userId, isOwner || isAdmin);
});

/**
 * Remote functions are publicly reachable HTTP endpoints, so every recipe-scoped
 * query must enforce authentication and the recipe's visibility itself instead of relying on the UI.
 */
async function assertRecipeVisible(recipeId: number) {
    const user = requireAuth();
    const recipe = await getRecipeByIdFromDb(recipeId);

    if (!recipe) {
        throw new Error('Recipe not found');
    }

    const isOwner = recipe.userId === user.id || !!user.administrator;
    if (recipe.visibility === 'private' && !isOwner) {
        throw new Error('Recipe is private');
    }

    return recipe;
}

async function requireNoteAccess(recipeId: number) {
    const userId = getRequestEvent().locals.user?.id;
    if (!userId) error(401, 'User not authenticated');
    await assertRecipeVisible(recipeId);
    return userId;
}

export const getRecipeNote = query(v.object({recipeId: positiveInt}), async ({recipeId}) => {
    const userId = await requireNoteAccess(recipeId);
    const [row] = await getDb().select({note: recipeNotes.note}).from(recipeNotes)
        .where(and(eq(recipeNotes.userId, userId), eq(recipeNotes.recipeId, recipeId)));
    return row?.note ?? '';
});

export const saveRecipeNote = command(v.object({
    recipeId: positiveInt,
    note: v.pipe(v.string(), v.trim(), v.maxLength(4000)),
}), async ({recipeId, note}) => {
    const userId = await requireNoteAccess(recipeId);
    const db = getDb();
    if (!note) {
        await db.delete(recipeNotes).where(and(eq(recipeNotes.userId, userId), eq(recipeNotes.recipeId, recipeId)));
    } else {
        await db.insert(recipeNotes).values({userId, recipeId, note})
            .onConflictDoUpdate({target: [recipeNotes.userId, recipeNotes.recipeId], set: {note}});
    }
    return note;
});

export const getSteps = query(v.object({
    recipeId: positiveInt
}), async ({recipeId}) => {
    await assertRecipeVisible(recipeId);
    return await getStepsFromDb(recipeId);
});

export const getIngredients = query(v.object({
    recipeId: positiveInt
}), async ({recipeId}) => {
    await assertRecipeVisible(recipeId);
    return await getIngredientsFromDb(recipeId);
});

export const getTags = query(v.object({
    recipeId: positiveInt
}), async ({recipeId}) => {
    await assertRecipeVisible(recipeId);
    return await getTagsFromDb(recipeId);
});

export const getRecipeFavoriteState = query(v.object({
    recipeId: positiveInt
}), async ({recipeId}) => {
    const user = requireAuth();
    await assertRecipeVisible(recipeId);
    return await getRecipeFavoriteStateFromDb(user.id, recipeId);
});

export const getRecipeRatingSummary = query(v.object({
    recipeId: positiveInt
}), async ({recipeId}) => {
    await assertRecipeVisible(recipeId);
    return await getRecipeRatingSummaryFromDb(recipeId);
});

export const getUserRecipeRating = query(v.object({
    recipeId: positiveInt
}), async ({recipeId}) => {
    const user = requireAuth();
    await assertRecipeVisible(recipeId);
    return await getUserRecipeRatingFromDb(user.id, recipeId);
});

export const getCollectionRecipes = query(v.object({
    collectionId: positiveInt
}), async ({collectionId}) => {
    const user = requireAuth();
    return await getCollectionRecipesFromDb(collectionId, user.id);
});

export const getRecipeDetails = query(v.object({
    recipeId: positiveInt,
    incrementView: v.optional(v.boolean(), false)
}), async ({recipeId, incrementView}) => {
    const user = requireAuth();
    const recipe = await assertRecipeVisible(recipeId);
    const isOwner = recipe.userId === user.id || !!user.administrator;

    if (incrementView) {
        await incrementRecipeViewCount(recipeId);
    }

    const sharePath = isOwner && recipe.shareEnabled && recipe.shareToken ? `/share/${recipe.shareToken}` : null;
    const {shareToken, ...recipeWithoutToken} = recipe;

    const [steps, ingredients, ratingSummary, tips, isFavorite, userRating] = await Promise.all([
        getStepsFromDb(recipeId),
        getIngredientsFromDb(recipeId),
        getRecipeRatingSummaryFromDb(recipeId),
        getTipsFromDb(recipeId),
        getRecipeFavoriteStateFromDb(user.id, recipeId),
        getUserRecipeRatingFromDb(user.id, recipeId)
    ]);

    return {
        ...recipeWithoutToken,
        sharePath,
        isFavorite,
        ingredients,
        steps,
        averageRating: ratingSummary.average,
        ratingCount: ratingSummary.count,
        userRating,
        tips
    };
});

export const getRecipeForEdit = query(v.object({
    recipeId: positiveInt
}), async ({recipeId}) => {
    const user = requireAuth();
    const recipe = await getRecipeByIdFromDb(recipeId);

    if (!recipe) {
        throw new Error('Recipe not found');
    }

    if (recipe.userId !== user.id) {
        throw new Error('You do not have permission to edit this recipe');
    }

    const {shareToken: _shareToken, ...recipeWithoutToken} = recipe;

    const [ingredients, steps, tags, tips] = await Promise.all([
        getIngredientsFromDb(recipeId),
        getStepsFromDb(recipeId),
        getTagsFromDb(recipeId),
        getTipsFromDb(recipeId)
    ]);

    return {
        ...recipeWithoutToken,
        ingredients,
        steps,
        tags,
        tips
    };
});

export const getSharedRecipeDetails = query(v.object({
    token: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
    incrementView: v.optional(v.boolean(), false)
}), async ({token, incrementView}) => {
    const recipe = await getRecipeByShareTokenFromDb(token);

    if (!recipe) {
        throw new Error('Recipe not found or share link inactive');
    }

    if (incrementView) {
        await incrementRecipeViewCount(recipe.id);
    }

    const [steps, ingredients, ratingSummary, tips] = await Promise.all([
        getStepsFromDb(recipe.id),
        getIngredientsFromDb(recipe.id),
        getRecipeRatingSummaryFromDb(recipe.id),
        getTipsFromDb(recipe.id)
    ]);

    return {
        ...recipe,
        ingredients,
        steps,
        tips,
        averageRating: ratingSummary.average,
        ratingCount: ratingSummary.count,
        userRating: null,
        isFavorite: false,
        sharePath: `/share/${token}`,
        shareEnabled: true
    };
});

export const getSimilarRecipes = query(v.object({
    recipeId: positiveInt,
    limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(24)), 6)
}), async ({recipeId, limit}) => {
    await assertRecipeVisible(recipeId);
    return getSimilarRecipesFromDb(recipeId, limit);
});
