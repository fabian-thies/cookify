import { getDb } from "$lib/server/db/index";
import { mealPlan, recipes, difficultyToRecipe, difficulty, ingredients, user } from "$lib/server/db/schema";
import { and, eq, gte, lte, desc, getTableColumns, sql, sum } from "drizzle-orm";
import { recipeColumns } from "$lib/server/db/recipe";
import { randomBytes } from "node:crypto";

const CALENDAR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

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

export async function getOrCreateCalendarToken(userId: string): Promise<string> {
    const db = getDb();
    const [row] = await db
        .select({token: user.calendarToken})
        .from(user)
        .where(eq(user.id, userId));

    if (!row) {
        throw new Error('User not found');
    }

    return row.token ?? rotateCalendarToken(userId);
}

export async function rotateCalendarToken(userId: string): Promise<string> {
    const db = getDb();
    const token = randomBytes(24).toString('base64url');
    const [row] = await db
        .update(user)
        .set({calendarToken: token})
        .where(eq(user.id, userId))
        .returning({token: user.calendarToken});

    if (!row?.token) {
        throw new Error('User not found');
    }

    return row.token;
}

export async function getUserIdByCalendarToken(token: string): Promise<string | null> {
    if (!CALENDAR_TOKEN_PATTERN.test(token)) {
        return null;
    }

    const db = getDb();
    const [row] = await db
        .select({id: user.id})
        .from(user)
        .where(eq(user.calendarToken, token))
        .limit(1);

    return row?.id ?? null;
}

export async function getCalendarEvents(userId: string) {
    const db = getDb();
    return db
        .select({
            id: mealPlan.id,
            date: mealPlan.date,
            createdAt: mealPlan.createdAt,
            recipeId: recipes.id,
            title: recipes.title,
            cookingTime: recipes.cookingTime,
            servings: recipes.servings,
        })
        .from(mealPlan)
        .innerJoin(recipes, eq(mealPlan.recipeId, recipes.id))
        .where(eq(mealPlan.userId, userId))
        .orderBy(mealPlan.date, mealPlan.createdAt);
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
