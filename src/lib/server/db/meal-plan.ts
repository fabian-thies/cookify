import { getDb } from "$lib/server/db/index";
import { mealPlan, recipes, difficultyToRecipe, difficulty, ingredients } from "$lib/server/db/schema";
import { and, eq, gte, lte, desc, getTableColumns, sql, sum } from "drizzle-orm";
import { recipeColumns } from "$lib/server/db/recipe";

const tagListSubquery = sql<string[]>`COALESCE(ARRAY(
    SELECT tags.name
    FROM tags
    WHERE tags.recipe_id = ${recipes.id}
), ARRAY[]::text[])`;

export async function addToMealPlan(userId: string, recipeId: number, date: string) {
    const db = getDb();
    const result = await db.insert(mealPlan).values({
        userId,
        recipeId,
        date,
    }).returning({ id: mealPlan.id });
    return result[0];
}

export async function removeFromMealPlan(mealPlanId: number, userId: string) {
    const db = getDb();
    const [entry] = await db.select({ userId: mealPlan.userId })
        .from(mealPlan)
        .where(eq(mealPlan.id, mealPlanId));

    if (!entry || entry.userId !== userId) {
        throw new Error('Insufficient permissions');
    }

    await db.delete(mealPlan).where(eq(mealPlan.id, mealPlanId));
}

export async function getMealPlan(userId: string, startDate: string, endDate: string) {
    const db = getDb();

    const entries = await db
        .select({
            ...getTableColumns(mealPlan),
            recipe: {
                ...recipeColumns,
                difficulty: difficulty.difficulty,
                tags: tagListSubquery,
            },
        })
        .from(mealPlan)
        .innerJoin(recipes, eq(mealPlan.recipeId, recipes.id))
        .innerJoin(difficultyToRecipe, eq(difficultyToRecipe.recipeId, recipes.id))
        .innerJoin(difficulty, eq(difficulty.id, difficultyToRecipe.difficultyId))
        .where(and(
            eq(mealPlan.userId, userId),
            gte(mealPlan.date, startDate),
            lte(mealPlan.date, endDate)
        ))
        .orderBy(mealPlan.date, mealPlan.createdAt);

    return entries;
}

export async function getShoppingList(userId: string, startDate: string, endDate: string) {
    const db = getDb();

    const items = await db
        .select({
            name: ingredients.name,
            quantity: sum(ingredients.quantity).mapWith(Number),
            unit: ingredients.unit,
        })
        .from(mealPlan)
        .innerJoin(ingredients, eq(mealPlan.recipeId, ingredients.recipeId))
        .where(and(
            eq(mealPlan.userId, userId),
            gte(mealPlan.date, startDate),
            lte(mealPlan.date, endDate)
        ))
        .groupBy(ingredients.name, ingredients.unit)
        .orderBy(ingredients.name);

    return items;
}
