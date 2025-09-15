import {db} from "$lib/server/db/index";
import {
    difficulty,
    difficultyToRecipe,
    favorite,
    ingredients,
    recipes,
    steps,
    steps as stepsTable,
    tags as tagsTable
} from "$lib/server/db/schema";
import {getDifficultyId} from "$lib/server/utils";
import {and, eq, getTableColumns, sql} from "drizzle-orm";

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

export async function getRecipes() {
    return db.select({
        ...getTableColumns(recipes),
        difficulty: difficulty.difficulty,
    })
        .from(recipes)
        .leftJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .leftJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId));
}

export async function getFavoriteRecipes() {
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

export async function getRecipeFavoriteState(userId: string, recipeId: number) {
    const rows = await db
        .select({ favorite: favorite.favorite })
        .from(favorite)
        .where(and(eq(favorite.userId, userId), eq(favorite.recipeId, recipeId)));

    return rows[0]?.favorite ?? false;
}

export async function getSteps(recipeId: number) {
    return db.select(getTableColumns(steps)).from(steps).where(eq(steps.recipeId, recipeId));
}

export async function getIngredients(recipeId: number) {
    return db.select(getTableColumns(ingredients)).from(ingredients).where(eq(ingredients.recipeId, recipeId));
}

export async function getTags(recipeId: number) {
    return db.select(getTableColumns(tagsTable)).from(tagsTable).where(eq(tagsTable.recipeId, recipeId));
}

export async function getDifficulties() {
    return db.select().from(difficulty).orderBy(difficulty.id);
}

export async function toggleRecipeFavorite(userId: string, recipeId: number) {
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

export type Recipe = Awaited<ReturnType<typeof getRecipes>>[number];
export type Difficulty = Awaited<ReturnType<typeof getDifficulties>>[number];