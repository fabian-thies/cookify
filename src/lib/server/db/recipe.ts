import {getDb} from "$lib/server/db/index";
import {
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
        .leftJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .leftJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
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

export type Recipe = Awaited<ReturnType<typeof getRecipes>>[number];
export type Difficulty = Awaited<ReturnType<typeof getDifficulties>>[number];
