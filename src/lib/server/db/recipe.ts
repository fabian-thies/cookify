import {getDb} from "$lib/server/db/index";
import {
    collections, collectionToRecipe,
    cookHistory,
    difficulty,
    difficultyToRecipe,
    favorite,
    ingredients,
    mealPlan,
    recipeRating,
    recipes,
    steps,
    steps as stepsTable,
    tags as tagsTable,
    tips as tipsTable
} from "$lib/server/db/schema";
import {getDifficultyId} from "$lib/server/utils";
import {deleteImage} from "$lib/server/image";
import {and, asc, desc, eq, getTableColumns, gt, gte, inArray, lte, ne, notInArray, or, sql} from "drizzle-orm";
import type {CreateRecipeInput, Difficulty as DifficultyName, UpdateRecipeInput} from "$lib/types/recipe";
import type {CookTimeFilter} from "$lib/recipe-filters";
import {getRequestEvent} from "$app/server";
import {randomUUID} from "crypto";

export type RecipeOrderBy = "recent" | "popular" | "random" | "rating" | "cookTime" | "lastCooked";
export type RecipeListFilters = {
    difficulty?: DifficultyName;
    cookTime?: CookTimeFilter;
    tag?: string;
    author?: "all" | "user";
};

function cookTimeSqlCondition(cookTime: CookTimeFilter) {
    switch (cookTime) {
        case "0-15":
            return lte(recipes.cookingTime, 15);
        case "15-30":
            return and(gt(recipes.cookingTime, 15), lte(recipes.cookingTime, 30));
        case "30-60":
            return and(gt(recipes.cookingTime, 30), lte(recipes.cookingTime, 60));
        case "60+":
            return gt(recipes.cookingTime, 60);
    }
}

function recipeOrderByExpressions(orderBy: RecipeOrderBy, viewerId?: string) {
    switch (orderBy) {
        case "recent":
            return [desc(recipes.createdAt), desc(recipes.id)];
        case "popular":
            return [desc(recipes.viewCount), desc(recipes.id)];
        case "random":
            return [sql`RANDOM()`];
        case "cookTime":
            return [asc(recipes.cookingTime), desc(recipes.createdAt), desc(recipes.id)];
        case "rating": {
            const avgRating = sql`(
                SELECT AVG(${recipeRating.rating})::float
                FROM ${recipeRating}
                WHERE ${recipeRating.recipeId} = ${recipes.id}
            )`;
            const ratingCount = sql`(
                SELECT COUNT(*)::int
                FROM ${recipeRating}
                WHERE ${recipeRating.recipeId} = ${recipes.id}
            )`;
            return [
                sql`${avgRating} DESC NULLS LAST`,
                desc(ratingCount),
                desc(recipes.createdAt),
                desc(recipes.id)
            ];
        }
        case "lastCooked": {
            if (!viewerId) {
                return [desc(recipes.createdAt), desc(recipes.id)];
            }
            const lastCooked = sql`(
                SELECT MAX(${cookHistory.cookedAt})
                FROM ${cookHistory}
                WHERE ${cookHistory.recipeId} = ${recipes.id}
                  AND ${cookHistory.userId} = ${viewerId}
            )`;
            return [
                sql`${lastCooked} DESC NULLS LAST`,
                desc(recipes.createdAt),
                desc(recipes.id)
            ];
        }
    }
}

const tagListSubquery = sql<string[]>`COALESCE(ARRAY(
    SELECT ${tagsTable.name}
    FROM ${tagsTable}
    WHERE ${tagsTable.recipeId} = ${recipes.id}
), ARRAY[]::text[])`;

// `search_vector` is maintained in the database and only needed for searching, so keep it out of API payloads.
const {searchVector: _searchVector, ...recipeColumns} = getTableColumns(recipes);
// `share_token` grants unauthenticated access to a recipe, so omit it from general recipe queries.
const {shareToken: _shareToken, ...publicRecipeColumns} = recipeColumns;

export {recipeColumns, publicRecipeColumns};

export async function createRecipe({
                                       title,
                                       description,
                                       sourceUrl = null,
                                       cookTime,
                                       servings,
                                       userId,
                                       difficulty,
                                       ingredientsList,
                                       steps,
                                       tips,
                                       tags,
                                       image,
                                       visibility,
                                       calories = null,
                                       protein = null,
                                       carbs = null,
                                       fat = null,
                                       fiber = null
                                   }: CreateRecipeInput) {
    const db = getDb();
    return db.transaction(async (db) => {
        const result = await db.insert(recipes).values({
            title,
            description,
            sourceUrl,
            image,
            cookingTime: cookTime,
            servings,
            userId: userId,
            visibility,
            calories,
            protein,
            carbs,
            fat,
            fiber
        }).returning({id: recipes.id});

        await db.insert(difficultyToRecipe).values({recipeId: result[0].id, difficultyId: getDifficultyId(difficulty)});

        if (ingredientsList.length > 0) {
            await db.insert(ingredients).values(
                ingredientsList.map((ingredient) => ({
                    recipeId: result[0].id,
                    name: ingredient.name,
                    quantity: ingredient.amount,
                    unit: ingredient.unit,
                }))
            );
        }

        if (steps.length > 0) {
            await db.insert(stepsTable).values(
                steps.map((step, index) => ({
                    recipeId: result[0].id,
                    step,
                    number: index + 1,
                }))
            );
        }

        if (tags.length > 0) {
            await db.insert(tagsTable).values(
                tags.map((tag) => ({
                    recipeId: result[0].id,
                    name: tag,
                }))
            );
        }

        if (tips.length > 0) {
            await db.insert(tipsTable).values(
                tips.map((tip) => ({
                    recipeId: result[0].id,
                    tip,
                }))
            );
        }

        return result;
    });
}

export async function deleteRecipe(userId: string, recipeId: number) {
    const db = getDb();
    const {deleted, imageToDelete} = await db.transaction(async (tx) => {
        const recipe = await tx.select({userId: recipes.userId, image: recipes.image}).from(recipes)
            .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
            .limit(1);

        if (userId !== recipe[0]?.userId) {
            throw new Error('Insufficient permissions');
        }

        await tx.delete(mealPlan).where(eq(mealPlan.recipeId, recipeId));
        await tx.delete(favorite).where(eq(favorite.recipeId, recipeId));
        await tx.delete(recipeRating).where(eq(recipeRating.recipeId, recipeId));
        await tx.delete(cookHistory).where(eq(cookHistory.recipeId, recipeId));
        await tx.delete(collectionToRecipe).where(eq(collectionToRecipe.recipeId, recipeId));
        await tx.delete(difficultyToRecipe).where(eq(difficultyToRecipe.recipeId, recipeId));
        await tx.delete(ingredients).where(eq(ingredients.recipeId, recipeId));
        await tx.delete(stepsTable).where(eq(stepsTable.recipeId, recipeId));
        await tx.delete(tagsTable).where(eq(tagsTable.recipeId, recipeId));
        await tx.delete(tipsTable).where(eq(tipsTable.recipeId, recipeId));
        const deleted = await tx.delete(recipes)
            .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
            .returning({id: recipes.id});

        const image = recipe[0].image;
        const [shared] = deleted.length > 0 && image
            ? await tx.select({id: recipes.id}).from(recipes).where(eq(recipes.image, image)).limit(1)
            : [];

        return {deleted, imageToDelete: deleted.length > 0 && image && !shared ? image : null};
    });

    if (imageToDelete) {
        await deleteImage(imageToDelete);
    }

    return deleted;
}

export async function updateRecipe({
                                       id,
                                       title,
                                       description,
                                       sourceUrl,
                                       cookTime,
                                       servings,
                                       userId,
                                       difficulty,
                                       ingredientsList,
                                       steps,
                                       tips,
                                       tags,
                                       image,
                                       visibility,
                                       calories = null,
                                       protein = null,
                                       carbs = null,
                                       fat = null,
                                       fiber = null
                                   }: UpdateRecipeInput) {
    const db = getDb();
    return db.transaction(async (db) => {
        const [existingRecipe] = await db.select({userId: recipes.userId})
            .from(recipes)
            .where(eq(recipes.id, id));

        if (!existingRecipe) {
            throw new Error('Recipe not found');
        }

        if (existingRecipe.userId !== userId) {
            throw new Error('Insufficient permissions');
        }

        await db.update(recipes)
            .set({
                title,
                description,
                sourceUrl,
                image,
                cookingTime: cookTime,
                servings,
                userId,
                updatedAt: new Date(),
                visibility,
                calories,
                protein,
                carbs,
                fat,
                fiber
            })
            .where(eq(recipes.id, id));

        await db.update(difficultyToRecipe)
            .set({difficultyId: getDifficultyId(difficulty)})
            .where(eq(difficultyToRecipe.recipeId, id));

        await db.delete(ingredients).where(eq(ingredients.recipeId, id));
        if (ingredientsList.length > 0) {
            await db.insert(ingredients).values(
                ingredientsList.map((ingredient) => ({
                    recipeId: id,
                    name: ingredient.name,
                    quantity: ingredient.amount,
                    unit: ingredient.unit,
                }))
            );
        }

        await db.delete(stepsTable).where(eq(stepsTable.recipeId, id));
        if (steps.length > 0) {
            await db.insert(stepsTable).values(
                steps.map((step, index) => ({
                    recipeId: id,
                    step,
                    number: index + 1,
                }))
            );
        }

        await db.delete(tagsTable).where(eq(tagsTable.recipeId, id));
        if (tags.length > 0) {
            await db.insert(tagsTable).values(
                tags.map((tag) => ({
                    recipeId: id,
                    name: tag,
                }))
            );
        }

        await db.delete(tipsTable).where(eq(tipsTable.recipeId, id));
        if (tips.length > 0) {
            await db.insert(tipsTable).values(
                tips.map((tip) => ({
                    recipeId: id,
                    tip,
                }))
            );
        }

        return {id};
    });
}

export async function updateRecipeNutrition(
    recipeId: number,
    nutrition: {calories: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null}
) {
    const db = getDb();

    const [updated] = await db.update(recipes)
        .set(nutrition)
        .where(eq(recipes.id, recipeId))
        .returning({
            calories: recipes.calories,
            protein: recipes.protein,
            carbs: recipes.carbs,
            fat: recipes.fat,
            fiber: recipes.fiber
        });

    return updated;
}

export async function getRecipes(
    offset = 0,
    limit?: number,
    orderBy?: RecipeOrderBy,
    viewerId?: string,
    filters?: RecipeListFilters
) {
    const db = getDb();
    let query = db.select({
        ...publicRecipeColumns,
        difficulty: difficulty.difficulty,
        tags: tagListSubquery,
    })
        .from(recipes)
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .offset(offset)
        .$dynamic();

    const visibilityCondition = or(
        eq(recipes.visibility, "public"),
        viewerId ? eq(recipes.userId, viewerId) : undefined
    );
    const conditions = [visibilityCondition];

    if (filters?.difficulty) {
        conditions.push(eq(difficulty.difficulty, filters.difficulty));
    }
    if (filters?.cookTime) {
        const cookTimeCondition = cookTimeSqlCondition(filters.cookTime);
        if (cookTimeCondition) {
            conditions.push(cookTimeCondition);
        }
    }
    if (filters?.tag) {
        conditions.push(sql`EXISTS (
            SELECT 1
            FROM ${tagsTable}
            WHERE ${tagsTable.recipeId} = ${recipes.id}
              AND LOWER(${tagsTable.name}) = LOWER(${filters.tag})
        )`);
    }
    if (filters?.author === "user" && viewerId) {
        conditions.push(eq(recipes.userId, viewerId));
    }

    query = query.where(conditions.length === 1 ? visibilityCondition : and(...conditions));

    if (limit) {
        query = query.limit(limit);
    }

    query = query.orderBy(...recipeOrderByExpressions(orderBy ?? "recent", viewerId));

    return query;
}

function searchTerms(input: string): string[] {
    return input
        .toLowerCase()
        .split(/\s+/)
        .map((term) => term.replace(/[^\p{L}\p{N}]+/gu, ''))
        .filter((term) => term.length > 0);
}

export async function searchRecipesByIngredients(input: string, viewerId: string, orderBy?: RecipeOrderBy) {
    const terms = [...new Set(input.toLowerCase().split(',').map(term => term.trim()).filter(Boolean))];
    if (!terms.length) return [];

    // Each comma-separated term must match an ingredient name on the same recipe.
    const matches = terms.map(term => sql`exists (
        select 1 from ${ingredients}
        where ${ingredients.recipeId} = ${recipes.id}
          and strpos(lower(${ingredients.name}), ${term}) > 0
    )`);

    return getDb().select({
        ...publicRecipeColumns,
        difficulty: difficulty.difficulty,
        tags: tagListSubquery,
    })
        .from(recipes)
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .where(and(or(eq(recipes.visibility, 'public'), eq(recipes.userId, viewerId)), ...matches))
        .orderBy(...recipeOrderByExpressions(orderBy ?? "recent", viewerId))
        .limit(60);
}

export async function searchRecipes(searchTerm: string, viewerId?: string, limit = 60, orderBy?: RecipeOrderBy) {
    const query = searchTerm.trim();
    const terms = searchTerms(query);
    if (terms.length === 0) {
        return [];
    }

    const db = getDb();
    const tsQuery = terms.map((term) => `${term}:*`).join(' & ');

    // Every word has to match somewhere, either as a full-text prefix or fuzzily via trigrams.
    // The trigram branch is what makes typos ("pancaks" -> "pancakes") work.
    const termMatches = terms.map((term) => or(
        sql`${recipes.searchVector} @@ to_tsquery('simple', ${`${term}:*`})`,
        sql`word_similarity(${term}, ${recipes.title}) > 0.45`,
        sql`word_similarity(${term}, ${recipes.description}) > 0.45`,
        sql`EXISTS (
            SELECT 1
            FROM ${tagsTable}
            WHERE ${tagsTable.recipeId} = ${recipes.id}
              AND word_similarity(${term}, ${tagsTable.name}) > 0.45
        )`
    ));

    const titleSimilarity = sql.join(
        terms.map((term) => sql`word_similarity(${term}, ${recipes.title})`),
        sql` + `
    );
    const descriptionSimilarity = sql.join(
        terms.map((term) => sql`word_similarity(${term}, ${recipes.description})`),
        sql` + `
    );

    const relevance = sql<number>`(
        ts_rank_cd(${recipes.searchVector}, to_tsquery('simple', ${tsQuery})) * 4 +
        (${titleSimilarity}) * 2 +
        (${descriptionSimilarity})
    )`;

    const orderByClauses = orderBy && orderBy !== "recent"
        ? recipeOrderByExpressions(orderBy, viewerId)
        : [desc(relevance), desc(recipes.createdAt), desc(recipes.id)];

    return db.select({
        ...publicRecipeColumns,
        difficulty: difficulty.difficulty,
        tags: tagListSubquery,
    })
        .from(recipes)
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .where(and(
            or(
                eq(recipes.visibility, "public"),
                viewerId ? eq(recipes.userId, viewerId) : sql`false`
            ),
            and(...termMatches)
        ))
        .orderBy(...orderByClauses)
        .limit(limit);
}

export async function getCollectionRecipes(collectionId: number, userId: string) {
    const db = getDb();

    if (!collectionId) {
        throw new Error('Collection ID is required');
    }

    const [collectionRow] = await db
        .select({ title: collections.title, userId: collections.userId })
        .from(collections)
        .where(eq(collections.id, collectionId));

    if (!collectionRow || collectionRow.userId !== userId) {
        throw new Error('Collection not found');
    }

    const recipesResult = await db.select({
        ...publicRecipeColumns,
        difficulty: difficulty.difficulty,
        tags: tagListSubquery,
    })
        .from(recipes)
        .innerJoin(collectionToRecipe, eq(collectionToRecipe.recipeId, recipes.id))
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .where(and(
            eq(collectionToRecipe.collectionId, collectionId),
            or(eq(recipes.visibility, "public"), eq(recipes.userId, userId))
        ));

    const collectionRecipes = {
        collectionTitle: collectionRow?.title,
        userId: collectionRow?.userId,
        recipes: recipesResult,
    };

    if(!collectionRecipes.userId) {
        throw new Error('Collection not found or has no recipes.');
    }

    return {
        collectionTitle: collectionRow?.title,
        userId: collectionRow?.userId,
        recipes: recipesResult,
    };
}

export async function deleteCollection(collectionId: number) {
    const db = getDb();
    const {locals} = getRequestEvent();

    if (!collectionId) {
        throw new Error('Collection ID is required');
    }

    const [collectionRow] = await db
        .select({ userId: collections.userId })
        .from(collections)
        .where(eq(collections.id, collectionId));

    if(!collectionRow) {
        throw new Error('Collection not found.');
    }

    if(collectionRow.userId !== locals.user?.id) {
        throw new Error('Insufficient permissions');
    }

    await db.delete(collectionToRecipe).where(eq(collectionToRecipe.collectionId, collectionId));

    return db.delete(collections)
        .where(eq(collections.id, collectionId))
        .returning({id: collections.id});
}

export async function getRecentRecipes() {
    return getRecipes(0, undefined, "recent");
}

export async function getPopularRecipes() {
    return getRecipes(0, undefined, "popular");
}

export async function getDiscoverRecipes() {
    return getRecipes(0, undefined, "random");
}

type TasteProfile = {
    tagWeights: Map<string, number>;
    difficultyWeights: Map<string, number>;
    interactedRecipeIds: Set<number>;
    hasSignals: boolean;
};

async function getTasteProfile(userId: string): Promise<TasteProfile> {
    const db = getDb();
    const cutoff = new Date(Date.now() - 180 * 86_400_000);

    const [favoriteRows, ratingRows, cookedRows] = await Promise.all([
        db.select({recipeId: favorite.recipeId})
            .from(favorite)
            .where(and(eq(favorite.userId, userId), eq(favorite.favorite, true))),
        db.select({recipeId: recipeRating.recipeId, rating: recipeRating.rating})
            .from(recipeRating)
            .where(eq(recipeRating.userId, userId)),
        db.select({
            recipeId: cookHistory.recipeId,
            count: sql<number>`COUNT(*)::int`,
            lastCooked: sql<Date>`MAX(${cookHistory.cookedAt})`
        })
            .from(cookHistory)
            .where(and(eq(cookHistory.userId, userId), gte(cookHistory.cookedAt, cutoff)))
            .groupBy(cookHistory.recipeId)
    ]);

    const interactedRecipeIds = new Set<number>([
        ...favoriteRows.map((row) => row.recipeId),
        ...ratingRows.map((row) => row.recipeId),
        ...cookedRows.map((row) => row.recipeId)
    ]);

    const tagWeights = new Map<string, number>();
    const difficultyWeights = new Map<string, number>();
    const addWeight = (map: Map<string, number>, key: string, weight: number) => {
        map.set(key, (map.get(key) ?? 0) + weight);
    };

    if (interactedRecipeIds.size > 0) {
        const details = await db
            .select({
                id: recipes.id,
                difficulty: difficulty.difficulty,
                tags: tagListSubquery,
            })
            .from(recipes)
            .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
            .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
            .where(inArray(recipes.id, [...interactedRecipeIds]));

        const detailsById = new Map(details.map((recipe) => [recipe.id, recipe]));
        const favoriteIds = new Set(favoriteRows.map((row) => row.recipeId));

        for (const recipe of details) {
            const tags = recipe.tags ?? [];

            if (favoriteIds.has(recipe.id)) {
                for (const tag of tags) addWeight(tagWeights, tag, 3);
                addWeight(difficultyWeights, recipe.difficulty, 2);
            }

            const rating = ratingRows.find((row) => row.recipeId === recipe.id)?.rating;
            if (rating != null) {
                const weight = rating - 3;
                for (const tag of tags) addWeight(tagWeights, tag, weight);
                addWeight(difficultyWeights, recipe.difficulty, weight * 0.5);
            }
        }

        for (const cooked of cookedRows) {
            const recipe = detailsById.get(cooked.recipeId);
            if (!recipe) continue;

            const daysAgo = (Date.now() - new Date(cooked.lastCooked).getTime()) / 86_400_000;
            const recencyFactor = daysAgo <= 14 ? 1.5 : daysAgo <= 60 ? 1 : 0.6;
            const weight = Math.min(cooked.count, 3) * recencyFactor * 1.2;

            for (const tag of recipe.tags ?? []) addWeight(tagWeights, tag, weight);
            addWeight(difficultyWeights, recipe.difficulty, weight * 0.5);
        }
    }

    return {
        tagWeights,
        difficultyWeights,
        interactedRecipeIds,
        hasSignals: [...tagWeights.values()].some((weight) => weight > 0) ||
            [...difficultyWeights.values()].some((weight) => weight > 0)
    };
}

export async function getForYouRecipes(userId: string, limit = 12) {
    const db = getDb();
    const profile = await getTasteProfile(userId);

    if (!profile.hasSignals) {
        return [];
    }

    const conditions = [
        eq(recipes.visibility, 'public'),
        ne(recipes.userId, userId)
    ];

    if (profile.interactedRecipeIds.size > 0) {
        conditions.push(notInArray(recipes.id, [...profile.interactedRecipeIds]));
    }

    const averageRating = sql<number>`COALESCE((
        SELECT AVG(${recipeRating.rating})::float
        FROM ${recipeRating}
        WHERE ${recipeRating.recipeId} = ${recipes.id}
    ), 0)`;
    const ratingCount = sql<number>`(
        SELECT COUNT(*)::int
        FROM ${recipeRating}
        WHERE ${recipeRating.recipeId} = ${recipes.id}
    )`;

    const candidates = await db
        .select({
            ...publicRecipeColumns,
            difficulty: difficulty.difficulty,
            tags: tagListSubquery,
            averageRating,
            ratingCount
        })
        .from(recipes)
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .where(and(...conditions));

    const maxTagWeight = Math.max(
        1,
        ...[...profile.tagWeights.values()].filter((weight) => weight > 0)
    );
    const maxDifficultyWeight = Math.max(
        1,
        ...[...profile.difficultyWeights.values()].filter((weight) => weight > 0)
    );

    return candidates
        .map((recipe) => {
            const tagScore = (recipe.tags ?? []).reduce(
                (sum, tag) => sum + Math.max(0, profile.tagWeights.get(tag) ?? 0),
                0
            ) / maxTagWeight;
            const difficultyScore = Math.max(
                0,
                profile.difficultyWeights.get(recipe.difficulty) ?? 0
            ) / maxDifficultyWeight;
            const ratingScore = recipe.ratingCount > 0 ? (recipe.averageRating - 3) * 1.5 : 0;
            const popularityScore = Math.log10(1 + recipe.viewCount) * 0.7;
            const score = tagScore * 6 + difficultyScore * 2 + ratingScore + popularityScore;

            return {...recipe, feedScore: score};
        })
        .filter((recipe) => recipe.feedScore > 0.25)
        .sort((a, b) =>
            b.feedScore - a.feedScore ||
            b.viewCount - a.viewCount ||
            b.createdAt.getTime() - a.createdAt.getTime()
        )
        .slice(0, limit)
        .map(({feedScore, ...recipe}) => recipe);
}

export async function getFavoriteRecipes(userId: string, orderBy?: RecipeOrderBy) {
    const db = getDb();
    let query = db.select({
        ...publicRecipeColumns,
        difficulty: difficulty.difficulty,
        tags: tagListSubquery,
    })
        .from(recipes)
        .innerJoin(favorite, eq(favorite.recipeId, recipes.id))
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .where(and(
            eq(favorite.userId, userId),
            eq(favorite.favorite, true),
            or(eq(recipes.visibility, "public"), eq(recipes.userId, userId))
        ))
        .$dynamic();

    if (orderBy) {
        query = query.orderBy(...recipeOrderByExpressions(orderBy, userId));
    }

    return query;
}

export async function getRecipeById(id: number) {
    const db = getDb();
    const result = await db
        .select({
            ...recipeColumns,
            difficulty: difficulty.difficulty,
            tags: tagListSubquery,
        })
        .from(recipes)
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .where(eq(recipes.id, id));

    return result[0] ?? null;
}

export async function getRecipeByShareToken(token: string) {
    const db = getDb();
    const [row] = await db
        .select({
            ...publicRecipeColumns,
            difficulty: difficulty.difficulty,
        })
        .from(recipes)
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .where(and(eq(recipes.shareToken, token), eq(recipes.shareEnabled, true)));

    return row ?? null;
}

export async function enableRecipeShare(userId: string, recipeId: number) {
    const db = getDb();
    const [recipe] = await db
        .select({ownerId: recipes.userId})
        .from(recipes)
        .where(eq(recipes.id, recipeId));

    if (!recipe) {
        throw new Error("Recipe not found");
    }

    if (recipe.ownerId !== userId) {
        throw new Error("Insufficient permissions");
    }

    const token = randomUUID().replace(/-/g, "");

    const [updated] = await db
        .update(recipes)
        .set({
            shareEnabled: true,
            shareToken: token,
            updatedAt: new Date()
        })
        .where(eq(recipes.id, recipeId))
        .returning({shareToken: recipes.shareToken, shareEnabled: recipes.shareEnabled});

    return updated;
}

export async function disableRecipeShare(userId: string, recipeId: number) {
    const db = getDb();
    const [recipe] = await db
        .select({ownerId: recipes.userId})
        .from(recipes)
        .where(eq(recipes.id, recipeId));

    if (!recipe) {
        throw new Error("Recipe not found");
    }

    if (recipe.ownerId !== userId) {
        throw new Error("Insufficient permissions");
    }

    const [updated] = await db
        .update(recipes)
        .set({
            shareEnabled: false,
            shareToken: null,
            updatedAt: new Date()
        })
        .where(eq(recipes.id, recipeId))
        .returning({shareToken: recipes.shareToken, shareEnabled: recipes.shareEnabled});

    return updated;
}

export async function getRecipesByUserId(userId: string, includePrivate = false) {
    const db = getDb();

    let query = db.select({
        ...publicRecipeColumns,
        difficulty: difficulty.difficulty,
        tags: tagListSubquery,
    })
        .from(recipes)
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .$dynamic();

    const conditions = [eq(recipes.userId, userId)];

    if (!includePrivate) {
        conditions.push(eq(recipes.visibility, "public"));
    }

    return query.where(and(...conditions));
}

export async function getRecipeFavoriteState(userId: string, recipeId: number) {
    const db = getDb();
    const rows = await db
        .select({favorite: favorite.favorite})
        .from(favorite)
        .where(and(eq(favorite.userId, userId), eq(favorite.recipeId, recipeId)));

    return rows[0]?.favorite ?? false;
}

export async function getSteps(recipeId: number) {
    const db = getDb();
    return db
        .select(getTableColumns(steps))
        .from(steps)
        .where(eq(steps.recipeId, recipeId))
        .orderBy(asc(steps.number), asc(steps.id));
}

export async function getIngredients(recipeId: number) {
    const db = getDb();
    return db
        .select(getTableColumns(ingredients))
        .from(ingredients)
        .where(eq(ingredients.recipeId, recipeId))
        .orderBy(asc(ingredients.id));
}

export async function getTags(recipeId: number) {
    const db = getDb();
    return db.select(getTableColumns(tagsTable)).from(tagsTable).where(eq(tagsTable.recipeId, recipeId));
}

export async function getTips(recipeId: number) {
    const db = getDb();
    return db.select(getTableColumns(tipsTable)).from(tipsTable).where(eq(tipsTable.recipeId, recipeId));
}

export async function getDifficulties() {
    const db = getDb();
    return db.select().from(difficulty).orderBy(difficulty.id);
}

export async function toggleRecipeFavorite(userId: string, recipeId: number) {
    const db = getDb();
    return db.insert(favorite)
        .values({
            recipeId,
            userId,
            favorite: true,
        })
        .onConflictDoUpdate({
            target: [favorite.recipeId, favorite.userId],
            set: {
                favorite: sql`NOT
                ${favorite.favorite}`,
            },
        });
}

export async function incrementRecipeViewCount(recipeId: number) {
    const db = getDb();
    return db.update(recipes)
        .set({viewCount: sql`${recipes.viewCount} + 1`})
        .where(eq(recipes.id, recipeId));
}

export async function recordRecipeCooked(userId: string, recipeId: number) {
    const db = getDb();
    const [recipe] = await db
        .select({id: recipes.id, userId: recipes.userId, visibility: recipes.visibility})
        .from(recipes)
        .where(eq(recipes.id, recipeId));

    if (!recipe || (recipe.visibility !== 'public' && recipe.userId !== userId)) {
        throw new Error('Recipe not found');
    }

    return db.insert(cookHistory).values({userId, recipeId}).returning({id: cookHistory.id});
}

export async function getRecipeRatingSummary(recipeId: number) {
    const db = getDb();
    const [row] = await db
        .select({
            average: sql<number>`COALESCE
                (AVG(${recipeRating.rating})::float, 0)`,
            count: sql<number>`COUNT
                (${recipeRating.id})
                ::int`,
        })
        .from(recipeRating)
        .where(eq(recipeRating.recipeId, recipeId));

    const count = row?.count ?? 0;

    return {
        average: count > 0 ? row?.average ?? 0 : null,
        count,
    };
}

export async function getUserRecipeRating(userId: string, recipeId: number) {
    const db = getDb();
    const [row] = await db
        .select({rating: recipeRating.rating})
        .from(recipeRating)
        .where(and(eq(recipeRating.userId, userId), eq(recipeRating.recipeId, recipeId)));

    return row?.rating ?? null;
}

export async function upsertRecipeRating(userId: string, recipeId: number, rating: number) {
    const db = getDb();

    await db
        .insert(recipeRating)
        .values({
            userId,
            recipeId,
            rating,
        })
        .onConflictDoUpdate({
            target: [recipeRating.recipeId, recipeRating.userId],
            set: {
                rating,
                updatedAt: new Date(),
            },
        });

    return getRecipeRatingSummary(recipeId);
}

export async function getCollections(userId: string, recipeId?: number, thumbnailLimit = 3) {
    const db = getDb();

    if (!userId) {
        throw new Error('User ID is required.');
    }

    const recipeVisibilityCondition = sql`(${recipes.visibility} = 'public' OR ${recipes.userId} = ${userId})`;

    return db
        .select({
            ...getTableColumns(collections),
            recipeCount: sql<number>`COALESCE(COUNT(${recipes.id})::int, 0)`,
            isInCollection:
                recipeId != null
                    ? sql<boolean>`COALESCE(EXISTS (
                        SELECT 1
                        FROM ${collectionToRecipe}
                        JOIN ${recipes} ON ${recipes.id} = ${collectionToRecipe.recipeId}
                        WHERE ${collectionToRecipe.collectionId} = ${collections.id}
                            AND ${collectionToRecipe.recipeId} = ${recipeId}
                            AND ${recipeVisibilityCondition}
                    ), false)`
                    : sql<boolean>`false`,
            thumbnails: sql<string[]>`COALESCE(ARRAY(
                SELECT ${recipes.image}
                FROM ${collectionToRecipe}
                JOIN ${recipes} ON ${recipes.id} = ${collectionToRecipe.recipeId}
                WHERE ${collectionToRecipe.collectionId} = ${collections.id}
                    AND ${recipeVisibilityCondition}
                    AND ${recipes.image} <> ''
                ORDER BY ${recipes.createdAt} DESC
                LIMIT ${thumbnailLimit}
            ), ARRAY[]::text[])`,
        })
        .from(collections)
        .leftJoin(
            collectionToRecipe,
            eq(collectionToRecipe.collectionId, collections.id)
        )
        .leftJoin(
            recipes,
            and(
                eq(recipes.id, collectionToRecipe.recipeId),
                or(eq(recipes.visibility, 'public'), eq(recipes.userId, userId))
            )
        )
        .where(eq(collections.userId, userId))
        .groupBy(collections.id, collections.userId, collections.title);
}

export async function setCollectionTitle(collectionId: number, title: string) {
    const db = getDb();
    const {locals} = getRequestEvent();

    if (!collectionId) {
        throw new Error('Collection ID is required.');
    }

    const [collection] = await db
        .select({ userId: collections.userId })
        .from(collections)
        .where(eq(collections.id, collectionId));

    if (!collection) {
        throw new Error('Collection not found.');
    }

    if (collection.userId !== locals.user?.id) {
        throw new Error('Insufficient permissions');
    }

    const [updated] = await db
        .update(collections)
        .set({title: title})
        .where(eq(collections.id, collectionId))
        .returning({id: collections.id, title: collections.title});

    return updated;
}

export async function toggleRecipeInCollection(userId: string, recipeId: number, collectionId: number) {
    const db = getDb();

    if (!userId) {
        throw new Error('User ID is required.');
    }

    if (!recipeId || !collectionId) {
        throw new Error('Recipe ID and Collection ID are required.');
    }

    const [collection] = await db
        .select({userId: collections.userId})
        .from(collections)
        .where(eq(collections.id, collectionId));

    if (!collection) {
        throw new Error('Collection not found.');
    }

    if (collection.userId !== userId) {
        throw new Error('Insufficient permissions');
    }

    const [recipe] = await db
        .select({userId: recipes.userId, visibility: recipes.visibility})
        .from(recipes)
        .where(eq(recipes.id, recipeId));

    if (!recipe) {
        throw new Error('Recipe not found');
    }

    if (recipe.visibility !== 'public' && recipe.userId !== userId) {
        throw new Error('Recipe is private');
    }

    const [existing] = await db
        .select({id: collectionToRecipe.id})
        .from(collectionToRecipe)
        .where(and(
            eq(collectionToRecipe.recipeId, recipeId),
            eq(collectionToRecipe.collectionId, collectionId)
        ));

    if (existing) {
        await db
            .delete(collectionToRecipe)
            .where(eq(collectionToRecipe.id, existing.id));
        return {isInCollection: false};
    } else {
        const [inserted] = await db
            .insert(collectionToRecipe)
            .values({recipeId, collectionId})
            .returning({id: collectionToRecipe.id});
        return {isInCollection: true, id: inserted.id};
    }
}
export async function createCollection(userId: string, title: string, recipeId?: number) {
    const db = getDb();

    if (!userId || !title) {
        throw new Error('User ID and title are required.');
    }

    if (recipeId != null) {
        const [recipe] = await db
            .select({userId: recipes.userId, visibility: recipes.visibility})
            .from(recipes)
            .where(eq(recipes.id, recipeId));

        if (!recipe) {
            throw new Error('Recipe not found');
        }

        if (recipe.visibility !== 'public' && recipe.userId !== userId) {
            throw new Error('Recipe is private');
        }
    }

    const [collection] = await db.insert(collections).values({
        userId,
        title,
    }).returning({id: collections.id, title: collections.title});

    if (recipeId != null) {
        await db.insert(collectionToRecipe).values({
            recipeId,
            collectionId: collection.id
        });
    }

    return collection;
}

export type Recipe = Awaited<ReturnType<typeof getRecipes>>[number];
export type Difficulty = Awaited<ReturnType<typeof getDifficulties>>[number];

export async function getSimilarRecipes(recipeId: number, limit = 6) {
    const db = getDb();

    // Fetch the current recipe's tags and difficulty
    const currentRecipe = await getRecipeById(recipeId);
    if (!currentRecipe) {
        return [];
    }

    const currentTags: string[] = currentRecipe.tags ?? [];
    const currentDifficulty: string = currentRecipe.difficulty;

    // If no tags and no difficulty, we can't find similar recipes
    if (currentTags.length === 0 && !currentDifficulty) {
        return [];
    }

    // Build similarity score using SQL:
    // - shared tag count: number of tags that overlap with current recipe's tags
    // - difficulty match: +1 if same difficulty
    // Weight tags more heavily (x2) since they indicate topical similarity
    const sharedTagCount = currentTags.length > 0
        ? sql<number>`(
            SELECT COUNT(*)::int
            FROM ${tagsTable}
            WHERE ${tagsTable.recipeId} = ${recipes.id}
            AND ${tagsTable.name} IN (${sql.join(currentTags.map(t => sql`${t}`), sql`, `)})
        )`
        : sql<number>`0`;

    const difficultyMatch = sql<number>`CASE WHEN ${difficulty.difficulty} = ${currentDifficulty} THEN 1 ELSE 0 END`;

    const similarityScore = sql<number>`(${sharedTagCount}) * 2 + ${difficultyMatch}`;

    const similarRecipes = await db
        .select({
            ...publicRecipeColumns,
            difficulty: difficulty.difficulty,
            tags: tagListSubquery,
            similarityScore,
        })
        .from(recipes)
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .where(
            and(
                ne(recipes.id, recipeId),
                eq(recipes.visibility, 'public')
            )
        )
        .having(sql`(${sharedTagCount}) * 2 + ${difficultyMatch} > 0`)
        .groupBy(recipes.id, difficulty.difficulty)
        .orderBy(desc(similarityScore), desc(recipes.createdAt))
        .limit(limit);

    return similarRecipes;
}
