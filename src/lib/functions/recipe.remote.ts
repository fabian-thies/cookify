import * as v from 'valibot';
import {and, eq} from 'drizzle-orm';
import {error} from '@sveltejs/kit';
import {getDb} from '$lib/server/db';
import {recipeNotes} from '$lib/server/db/schema';
import {command, getRequestEvent, query} from '$app/server';
import {normalizeRecipeSourceUrl} from '$lib/recipe-source';
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
    createRecipe as createRecipeInDb,
    updateRecipe as updateRecipeInDb,
    incrementRecipeViewCount,
    recordRecipeCooked as recordRecipeCookedInDb,
    getSimilarRecipes as getSimilarRecipesFromDb
} from '$lib/server/db/recipe';

function requireAuth() {
    const {locals} = getRequestEvent();
    if (!locals.user) {
        throw new Error('User not authenticated');
    }
    return locals.user;
}

export const likeRecipe = command(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    const user = requireAuth();
    await assertRecipeVisible(recipeId);

    return await toggleRecipeFavorite(user.id, recipeId);
});

export const deleteRecipe = command(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    const user = requireAuth();

    return await deleteRecipeFromDb(user.id, recipeId);
});

export const rateRecipe = command(v.object({
    recipeId: v.number(),
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
    collectionId: v.number()
}), async ({collectionId}) => {
    requireAuth();
    return await deleteCollectionFromDb(collectionId);
});

export const getCollections = query(async () => {
    const user = requireAuth();

    return getCollectionsFromDb(user.id, undefined, 4);
});

export const setCollectionTitle = command(v.object({
    title: v.string(),
    collectionId: v.number()
}), async ({title, collectionId}) => {
    requireAuth();

    if (!title) {
        throw new Error('Collection title is required');
    }

    if(!collectionId) {
        throw new Error('Collection ID is required');
    }

    return(setCollectionTitleInDb(collectionId, title));
});

const MAX_INT32 = 2_147_483_647;
const positiveInt = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(MAX_INT32));

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
    orderBy: v.optional(v.picklist(['recent', 'popular']))
})), async (params) => {
    const {offset = 0, limit, orderBy} = params || {};
    const {locals} = getRequestEvent();
    if (!locals.user) throw new Error('User not authenticated');
    return await getRecipesFromDb(offset, limit, orderBy, locals.user.id);
});

export const searchRecipes = query(v.object({
    query: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
    ingredientsOnly: v.optional(v.boolean(), false),
}), async ({query, ingredientsOnly}) => {
    const {locals} = getRequestEvent();
    if (!locals.user) throw new Error('User not authenticated');
    return ingredientsOnly ? searchRecipesByIngredients(query, locals.user.id) : searchRecipesFromDb(query, locals.user.id);
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
    recipeId: v.number()
}), async ({recipeId}) => {
    const user = requireAuth();
    await recordRecipeCookedInDb(user.id, recipeId);
});

export const getFavoriteRecipes = query(async () => {
    const user = requireAuth();
    return await getFavoriteRecipesFromDb(user.id);
});

export const getDifficulties = query(async () => {
    requireAuth();
    return await getDifficultiesFromDb();
});

export const getRecipeById = query(v.object({
    id: v.number(),
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
    userId: v.string()
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

const noteRecipeId = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(2_147_483_647));

async function requireNoteAccess(recipeId: number) {
    const userId = getRequestEvent().locals.user?.id;
    if (!userId) error(401, 'User not authenticated');
    await assertRecipeVisible(recipeId);
    return userId;
}

export const getRecipeNote = query(v.object({recipeId: noteRecipeId}), async ({recipeId}) => {
    const userId = await requireNoteAccess(recipeId);
    const [row] = await getDb().select({note: recipeNotes.note}).from(recipeNotes)
        .where(and(eq(recipeNotes.userId, userId), eq(recipeNotes.recipeId, recipeId)));
    return row?.note ?? '';
});

export const saveRecipeNote = command(v.object({
    recipeId: noteRecipeId,
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
    recipeId: v.number()
}), async ({recipeId}) => {
    await assertRecipeVisible(recipeId);
    return await getStepsFromDb(recipeId);
});

export const getIngredients = query(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    await assertRecipeVisible(recipeId);
    return await getIngredientsFromDb(recipeId);
});

export const getTags = query(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    await assertRecipeVisible(recipeId);
    return await getTagsFromDb(recipeId);
});

export const getRecipeFavoriteState = query(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    const user = requireAuth();
    await assertRecipeVisible(recipeId);
    return await getRecipeFavoriteStateFromDb(user.id, recipeId);
});

export const getRecipeRatingSummary = query(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    await assertRecipeVisible(recipeId);
    return await getRecipeRatingSummaryFromDb(recipeId);
});

export const getUserRecipeRating = query(v.object({
    recipeId: v.number()
}), async ({recipeId}) => {
    const user = requireAuth();
    await assertRecipeVisible(recipeId);
    return await getUserRecipeRatingFromDb(user.id, recipeId);
});

export const getCollectionRecipes = query(v.object({
    collectionId: v.number()
}), async ({collectionId}) => {
    const user = requireAuth();
    return await getCollectionRecipesFromDb(collectionId, user.id);
});

export const getRecipeDetails = query(v.object({
    recipeId: v.number(),
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
    recipeId: v.number()
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

const recipeSource = v.optional(v.nullable(v.pipe(
    v.string(),
    v.trim(),
    v.check(value => value === '' || normalizeRecipeSourceUrl(value) !== null, 'Invalid original recipe URL'),
    v.transform((value: string) => normalizeRecipeSourceUrl(value))
)));

export const createRecipe = command(v.object({
    title: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
    description: v.string(),
    cookTime: v.pipe(v.number(), v.integer(), v.minValue(0)),
    servings: v.pipe(v.number(), v.integer(), v.minValue(1)),
    difficulty: v.picklist(['easy', 'medium', 'hard']),
    ingredientsList: v.array(v.object({
        name: v.pipe(v.string(), v.minLength(1)),
        amount: v.number(),
        unit: v.string()
    })),
    steps: v.array(v.pipe(v.string(), v.minLength(1))),
    tags: v.array(v.pipe(v.string(), v.minLength(1))),
    tips: v.array(v.pipe(v.string(), v.minLength(1))),
    image: v.optional(v.string(), ''),
    sourceUrl: recipeSource,
    visibility: v.picklist(['public', 'private']),
    calories: v.optional(v.nullable(v.number()), null),
    protein: v.optional(v.nullable(v.number()), null),
    carbs: v.optional(v.nullable(v.number()), null),
    fat: v.optional(v.nullable(v.number()), null),
    fiber: v.optional(v.nullable(v.number()), null)
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
    description: v.string(),
    cookTime: v.pipe(v.number(), v.integer(), v.minValue(0)),
    servings: v.pipe(v.number(), v.integer(), v.minValue(1)),
    difficulty: v.picklist(['easy', 'medium', 'hard']),
    ingredientsList: v.array(v.object({
        name: v.pipe(v.string(), v.minLength(1)),
        amount: v.number(),
        unit: v.string()
    })),
    steps: v.array(v.pipe(v.string(), v.minLength(1))),
    tags: v.array(v.pipe(v.string(), v.minLength(1))),
    tips: v.array(v.pipe(v.string(), v.minLength(1))),
    image: v.optional(v.string()),
    sourceUrl: recipeSource,
    visibility: v.picklist(['public', 'private']),
    calories: v.optional(v.nullable(v.number()), null),
    protein: v.optional(v.nullable(v.number()), null),
    carbs: v.optional(v.nullable(v.number()), null),
    fat: v.optional(v.nullable(v.number()), null),
    fiber: v.optional(v.nullable(v.number()), null)
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

export const getSimilarRecipes = query(v.object({
    recipeId: v.number(),
    limit: v.optional(v.number(), 6)
}), async ({recipeId, limit}) => {
    await assertRecipeVisible(recipeId);
    return getSimilarRecipesFromDb(recipeId, limit);
});
