import {getDb} from "$lib/server/db/index";
import {
    collections, collectionToRecipe,
    difficulty,
    difficultyToRecipe,
    favorite,
    ingredients,
    recipeRating,
    recipes,
    steps,
    steps as stepsTable,
    tags as tagsTable
} from "$lib/server/db/schema";
import {getDifficultyId} from "$lib/server/utils";
import {and, desc, eq, getTableColumns, sql} from "drizzle-orm";
import type {CreateRecipeInput, UpdateRecipeInput} from "$lib/types/recipe";
import {getRequestEvent} from "$app/server";

export async function createRecipe({
                                       title,
                                       description,
                                       cookTime,
                                       servings,
                                       userId,
                                       difficulty,
                                       ingredientsList,
                                       steps,
                                       tags,
                                       image
                                   }: CreateRecipeInput) {
    const db = getDb();
    const result = await db.insert(recipes).values({
        title,
        description,
        image,
        cookingTime: cookTime,
        servings,
        userId: userId
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

    return result;
}

export async function deleteRecipe(userId: string, recipeId: number) {
    const db = getDb();

    const recipe = await db.select().from(recipes)
        .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
        .limit(1);

    if (userId !== recipe[0]?.userId) {
        throw new Error('Insufficient permissions');
    }

    await db.delete(favorite).where(eq(favorite.recipeId, recipeId));
    await db.delete(difficultyToRecipe).where(eq(difficultyToRecipe.recipeId, recipeId));
    await db.delete(ingredients).where(eq(ingredients.recipeId, recipeId));
    await db.delete(stepsTable).where(eq(stepsTable.recipeId, recipeId));
    await db.delete(tagsTable).where(eq(tagsTable.recipeId, recipeId));
    return db.delete(recipes)
        .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
        .returning({id: recipes.id});
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
                                       tags,
                                       image
                                   }: UpdateRecipeInput) {
    const db = getDb();
    await db.update(recipes)
        .set({
            title,
            description,
            image,
            cookingTime: cookTime,
            servings,
            userId,
            updatedAt: new Date(),
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

    return {id};
}

export async function getRecipes(offset = 0, limit?: number, orderBy?: "recent" | "popular") {
    const db = getDb();
    let query = db.select({
        ...getTableColumns(recipes),
        difficulty: difficulty.difficulty,
    })
        .from(recipes)
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .offset(offset)
        .$dynamic();

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
    }

    return query;
}

export async function getCollectionRecipes(collectionId: number) {
    const db = getDb();

    if (!collectionId) {
        throw new Error('Collection ID is required');
    }

    const [collectionRow] = await db
        .select({ title: collections.title, userId: collections.userId })
        .from(collections)
        .where(eq(collections.id, collectionId));

    const recipesResult = await db.select({
        ...getTableColumns(recipes),
        difficulty: difficulty.difficulty,
    })
        .from(recipes)
        .innerJoin(collectionToRecipe, eq(collectionToRecipe.recipeId, recipes.id))
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .where(eq(collectionToRecipe.collectionId, collectionId));

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

export async function getFavoriteRecipes() {
    const db = getDb();
    return db.select({
        ...getTableColumns(recipes),
        difficulty: difficulty.difficulty,
    })
        .from(recipes)
        .innerJoin(favorite, eq(favorite.recipeId, recipes.id))
        .leftJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .leftJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .where(eq(favorite.favorite, true));
}

export async function getRecipeById(id: number) {
    const db = getDb();
    const result = await db
        .select({
            ...getTableColumns(recipes),
            difficulty: difficulty.difficulty,
        })
        .from(recipes)
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .where(eq(recipes.id, id));

    return result[0] ?? null;
}

export async function getRecipesByUserId(userId: string) {
    const db = getDb();

    return db.select({
        ...getTableColumns(recipes),
        difficulty: difficulty.difficulty,
    })
        .from(recipes)
        .leftJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .leftJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .where(eq(recipes.userId, userId));
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

export async function getCollections(userId: string, recipeId?: number) {
    const db = getDb();

    if (!userId) {
        throw new Error('User ID is required.');
    }

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
export async function createCollectionInDb(userId: string, title: string, recipeId: number) {
    const db = getDb();

    if(!userId || !title || !recipeId) {
        throw new Error('User ID, title and recipe ID are required.');
    }

    const [collection] = await db.insert(collections).values({
        userId,
        title,
    }).returning({id: collections.id, title: collections.title});

    await db.insert(collectionToRecipe).values({
        recipeId,
        collectionId: collection.id
    });

    return collection;
}

export type Recipe = Awaited<ReturnType<typeof getRecipes>>[number];
export type Difficulty = Awaited<ReturnType<typeof getDifficulties>>[number];
