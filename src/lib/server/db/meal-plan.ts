import { getDb } from "$lib/server/db/index";
import { mealPlan, recipes, difficultyToRecipe, difficulty, ingredients, user, shoppingListItems } from "$lib/server/db/schema";
import { and, eq, gte, lte, desc, getTableColumns, notInArray, or, sql, type SQLWrapper } from "drizzle-orm";
import { recipeColumns } from "$lib/server/db/recipe";
import { categorizeIngredient, SHOPPING_CATEGORIES } from "$lib/shopping-list";
import { randomBytes } from "node:crypto";

// The share token grants access to a recipe, so it must never be part of a meal plan payload.
const { shareToken: _shareToken, ...mealPlanRecipeColumns } = recipeColumns;

function visibleRecipeCondition(userId: string) {
    return or(eq(recipes.visibility, "public"), eq(recipes.userId, userId));
}

const CALENDAR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

const tagListSubquery = sql<string[]>`COALESCE(ARRAY(
    SELECT tags.name
    FROM tags
    WHERE tags.recipe_id = ${recipes.id}
), ARRAY[]::text[])`;

export async function addToMealPlan(userId: string, recipeId: number, date: string, servings?: number) {
    const db = getDb();

    const [recipe] = await db
        .select({ userId: recipes.userId, visibility: recipes.visibility })
        .from(recipes)
        .where(eq(recipes.id, recipeId))
        .limit(1);

    if (!recipe) {
        throw new Error('Recipe not found');
    }

    // A meal plan is user-owned, but the referenced recipe is shared data: never let a
    // user add someone else's private recipe to their own plan.
    if (recipe.visibility !== 'public' && recipe.userId !== userId) {
        throw new Error('Insufficient permissions');
    }

    const result = await db.insert(mealPlan).values({
        userId,
        recipeId,
        date,
        servings,
    }).returning({ id: mealPlan.id });
    return result[0];
}

export async function updateMealPlanServings(userId: string, mealPlanId: number, servings: number) {
    const [entry] = await getDb().update(mealPlan)
        .set({ servings })
        .where(and(eq(mealPlan.id, mealPlanId), eq(mealPlan.userId, userId)))
        .returning({ id: mealPlan.id });

    if (!entry) throw new Error('Meal plan entry not found');
    return entry;
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
                ...mealPlanRecipeColumns,
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
            // Entries added before the visibility check existed must not leak private recipes.
            visibleRecipeCondition(userId),
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
        .where(and(
            eq(mealPlan.userId, userId),
            visibleRecipeCondition(userId)
        ))
        .orderBy(mealPlan.date, mealPlan.createdAt);
}

const CATEGORY_RANK = new Map<string, number>(
    SHOPPING_CATEGORIES.map((category, index) => [category, index])
);

function compareShoppingItems(
    a: { category: string; name: string; unit: string },
    b: { category: string; name: string; unit: string }
) {
    const categoryDiff =
        (CATEGORY_RANK.get(a.category) ?? SHOPPING_CATEGORIES.length) -
        (CATEGORY_RANK.get(b.category) ?? SHOPPING_CATEGORIES.length);
    if (categoryDiff !== 0) return categoryDiff;

    const nameDiff = a.name.localeCompare(b.name, 'de');
    if (nameDiff !== 0) return nameDiff;

    return a.unit.localeCompare(b.unit, 'de');
}

function shoppingQuantityIncreased(previous: SQLWrapper, current: SQLWrapper) {
    // Summation can change the last bits of a double when PostgreSQL visits rows in a different order.
    return sql<boolean>`(${current} - ${previous}) > greatest(abs(${current}), abs(${previous})) * ${16 * Number.EPSILON}`;
}

/**
 * Returns the persisted shopping list for the given range (the week starting at `startDate`).
 * A higher required quantity reopens a checked item until it is checked again.
 */
export async function getShoppingList(userId: string, startDate: string, endDate: string) {
    if (endDate < startDate) {
        throw new Error('Invalid date range');
    }

    const db = getDb();

    return db.transaction(async (tx) => {
        // Serialize recomputations for this week before reading the plan.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}), hashtext(${startDate}))`);
        const aggregated = await tx
            .select({
                name: ingredients.name,
                quantity: sql<number>`sum(
                    ${ingredients.quantity} * CASE
                        WHEN ${mealPlan.servings} IS NULL OR ${recipes.servings} <= 0 THEN 1
                        ELSE ${mealPlan.servings}::double precision / ${recipes.servings}
                    END
                )`.mapWith(Number),
                unit: ingredients.unit,
            })
            .from(mealPlan)
            .innerJoin(recipes, eq(mealPlan.recipeId, recipes.id))
            .innerJoin(ingredients, eq(mealPlan.recipeId, ingredients.recipeId))
            .where(and(
                eq(mealPlan.userId, userId),
                visibleRecipeCondition(userId),
                gte(mealPlan.date, startDate),
                lte(mealPlan.date, endDate)
            ))
            .groupBy(ingredients.name, ingredients.unit)
            .orderBy(ingredients.name);

        if (aggregated.length === 0) {
            await tx.delete(shoppingListItems).where(and(
                eq(shoppingListItems.userId, userId),
                eq(shoppingListItems.weekStart, startDate)
            ));
            return [];
        }

        const quantity = sql`excluded.quantity`;
        const increase = shoppingQuantityIncreased(shoppingListItems.quantity, quantity);
        const inserted = await tx
            .insert(shoppingListItems)
            .values(aggregated.map((item) => ({
                userId,
                weekStart: startDate,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                category: categorizeIngredient(item.name),
            })))
            .onConflictDoUpdate({
                target: [
                    shoppingListItems.userId,
                    shoppingListItems.weekStart,
                    shoppingListItems.name,
                    shoppingListItems.unit,
                ],
                set: {
                    quantity,
                    category: sql`excluded.category`,
                    checked: sql`${shoppingListItems.checked} and not (${increase})`,
                    quantityIncreased: sql`${shoppingListItems.quantityIncreased} or (${shoppingListItems.checked} and (${increase}))`,
                    updatedAt: new Date(),
                },
            })
            .returning({ id: shoppingListItems.id });

        await tx.delete(shoppingListItems).where(and(
            eq(shoppingListItems.userId, userId),
            eq(shoppingListItems.weekStart, startDate),
            notInArray(shoppingListItems.id, inserted.map((item) => item.id))
        ));

        const items = await tx
            .select({
                id: shoppingListItems.id,
                name: shoppingListItems.name,
                quantity: shoppingListItems.quantity,
                unit: shoppingListItems.unit,
                category: shoppingListItems.category,
                checked: shoppingListItems.checked,
                quantityIncreased: shoppingListItems.quantityIncreased,
            })
            .from(shoppingListItems)
            .where(and(
                eq(shoppingListItems.userId, userId),
                eq(shoppingListItems.weekStart, startDate)
            ));

        return items.sort(compareShoppingItems);
    });
}

export async function setShoppingListItemChecked(userId: string, itemId: number, checked: boolean, quantity: number) {
    const db = getDb();
    const shownQuantity = sql`cast(${quantity} as double precision)`;
    const newerQuantity = shoppingQuantityIncreased(shownQuantity, shoppingListItems.quantity);

    const [row] = await db
        .update(shoppingListItems)
        .set({ checked, quantityIncreased: checked ? false : undefined, updatedAt: new Date() })
        .where(and(
            eq(shoppingListItems.id, itemId),
            eq(shoppingListItems.userId, userId),
            checked ? sql`not (${newerQuantity})` : undefined,
        ))
        .returning({ id: shoppingListItems.id, checked: shoppingListItems.checked, quantityIncreased: shoppingListItems.quantityIncreased });

    if (!row) {
        throw new Error('Shopping list item has changed or is unavailable');
    }
    return row;
}
