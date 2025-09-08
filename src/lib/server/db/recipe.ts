import {db} from "$lib/server/db/index";
import {
    difficulty,
    difficultyToRecipe,
    favorite,
    ingredients,
    recipes,
    steps,
    steps as stepsTable
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

    for (const ingredient of ingredientsList) {
        await db.insert(ingredients).values({
            recipeId: result[0].id,
            name: ingredient.name,
            quantity: ingredient.amount,
            unit: ingredient.unit
        })
    }
    for (const step of steps) {
        await db.insert(stepsTable).values({recipeId: result[0].id, step: step, number: steps.indexOf(step) + 1})
    }
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