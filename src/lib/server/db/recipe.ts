import {getDb} from "$lib/server/db/index";
import {
    collections, collectionToRecipe,
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
 import {and, desc, eq, getTableColumns, ne, or, sql} from "drizzle-orm";
import type {CreateRecipeInput, UpdateRecipeInput} from "$lib/types/recipe";
import {getRequestEvent} from "$app/server";
import {randomUUID} from "crypto";

const tagListSubquery = sql<string[]>`COALESCE(ARRAY(
    SELECT ${tagsTable.name}
    FROM ${tagsTable}
    WHERE ${tagsTable.recipeId} = ${recipes.id}
), ARRAY[]::text[])`;

// `search_vector` is maintained in the database and only needed for searching, so keep it out of API payloads.
const {searchVector: _searchVector, ...recipeColumns} = getTableColumns(recipes);

export {recipeColumns};

export async function createRecipe({
                                       title,
                                       description,
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

        await db.insert(ingredients).values(
            ingredientsList.map((ingredient) => ({
                recipeId: result[0].id,
                name: ingredient.name,
                quantity: ingredient.amount,
                unit: ingredient.unit,
            }))
        );

        await db.insert(stepsTable).values(
            steps.map((step, index) => ({
                recipeId: result[0].id,
                step,
                number: index + 1,
            }))
        );

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
    return db.transaction(async (db) => {
        const recipe = await db.select().from(recipes)
            .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
            .limit(1);

        if (userId !== recipe[0]?.userId) {
            throw new Error('Insufficient permissions');
        }

        await db.delete(mealPlan).where(eq(mealPlan.recipeId, recipeId));
        await db.delete(favorite).where(eq(favorite.recipeId, recipeId));
        await db.delete(recipeRating).where(eq(recipeRating.recipeId, recipeId));
        await db.delete(collectionToRecipe).where(eq(collectionToRecipe.recipeId, recipeId));
        await db.delete(difficultyToRecipe).where(eq(difficultyToRecipe.recipeId, recipeId));
        await db.delete(ingredients).where(eq(ingredients.recipeId, recipeId));
        await db.delete(stepsTable).where(eq(stepsTable.recipeId, recipeId));
        await db.delete(tagsTable).where(eq(tagsTable.recipeId, recipeId));
        await db.delete(tipsTable).where(eq(tipsTable.recipeId, recipeId));
        return db.delete(recipes)
            .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
            .returning({id: recipes.id});
    });
}

export async function updateRecipe({
                                       id,
                                       title,
                                       description,
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
        await db.insert(ingredients).values(
            ingredientsList.map((ingredient) => ({
                recipeId: id,
                name: ingredient.name,
                quantity: ingredient.amount,
                unit: ingredient.unit,
            }))
        );

        await db.delete(stepsTable).where(eq(stepsTable.recipeId, id));
        await db.insert(stepsTable).values(
            steps.map((step, index) => ({
                recipeId: id,
                step,
                number: index + 1,
            }))
        );

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

export async function getRecipes(offset = 0, limit?: number, orderBy?: "recent" | "popular" | "random", viewerId?: string) {
    const db = getDb();
    let query = db.select({
        ...recipeColumns,
        difficulty: difficulty.difficulty,
        tags: tagListSubquery,
    })
        .from(recipes)
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .offset(offset)
        .$dynamic();

    query = query.where(or(
        eq(recipes.visibility, "public"),
        viewerId ? eq(recipes.userId, viewerId) : undefined
    ));

    if (limit) {
        query = query.limit(limit);
    }

    switch (orderBy) {
        case "recent":
            query = query.orderBy(desc(recipes.createdAt))
            break;
        case "popular":
            query = query.orderBy(desc(recipes.viewCount))
            break;
        case "random":
            query = query.orderBy(sql`RANDOM()`)
            break;
    }

    return query;
}

function searchTerms(input: string): string[] {
    return input
        .toLowerCase()
        .split(/\s+/)
        .map((term) => term.replace(/[^\p{L}\p{N}]+/gu, ''))
        .filter((term) => term.length > 0);
}

export async function searchRecipes(searchTerm: string, viewerId?: string, limit = 60) {
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

    return db.select({
        ...recipeColumns,
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
        .orderBy(desc(relevance), desc(recipes.createdAt))
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
        ...recipeColumns,
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

export async function getFavoriteRecipes(userId: string) {
    const db = getDb();
    return db.select({
        ...recipeColumns,
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
        ));
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
            ...recipeColumns,
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
        ...recipeColumns,
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
    return db.select(getTableColumns(steps)).from(steps).where(eq(steps.recipeId, recipeId));
}

export async function getIngredients(recipeId: number) {
    const db = getDb();
    return db.select(getTableColumns(ingredients)).from(ingredients).where(eq(ingredients.recipeId, recipeId));
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

    // TODO
    return db
        .select({
            ...getTableColumns(collections),
            recipeCount: sql<number>`COALESCE(COUNT(${collectionToRecipe.id})::int, 0)`,
            isInCollection:
                recipeId != null
                    ? sql<boolean>`COALESCE(EXISTS (
                SELECT 1
                FROM ${collectionToRecipe}
                        WHERE ${collectionToRecipe.collectionId} = ${collections.id}
                        AND ${collectionToRecipe.recipeId} = ${recipeId}
                        ), false)`
                    : sql<boolean>`false`,
            thumbnails: sql<string[]>`COALESCE(ARRAY(
                SELECT ${recipes.image}
                FROM ${collectionToRecipe}
                JOIN ${recipes} ON ${recipes.id} = ${collectionToRecipe.recipeId}
                WHERE ${collectionToRecipe.collectionId} = ${collections.id}
                ORDER BY ${recipes.createdAt} DESC
                LIMIT ${thumbnailLimit}
            ), ARRAY[]::text[])`,
        })
        .from(collections)
        .leftJoin(
            collectionToRecipe,
            eq(collectionToRecipe.collectionId, collections.id)
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

export async function toggleRecipeInCollection(recipeId: number, collectionId: number) {
    const db = getDb();

    if (!recipeId || !collectionId) {
        throw new Error('Recipe ID and Collection ID are required.');
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

    const [collection] = await db.insert(collections).values({
        userId,
        title,
    }).returning({id: collections.id, title: collections.title});

    if (recipeId) {
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
            ...recipeColumns,
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
