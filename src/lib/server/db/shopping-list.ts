import {and, eq, gte, inArray, lte, or, sql, type SQLWrapper} from 'drizzle-orm';
import {getDb} from '$lib/server/db/index';
import {ingredients, mealPlan, recipes, shoppingListItems, shoppingListShares, user} from '$lib/server/db/schema';
import {categorizeIngredient, SHOPPING_CATEGORIES} from '$lib/shopping-list';

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];
type Status = 'open' | 'bought' | 'have';

const CATEGORY_RANK = new Map<string, number>(SHOPPING_CATEGORIES.map((category, index) => [category, index]));

function compareShoppingItems(a: ShoppingItem, b: ShoppingItem) {
    return (CATEGORY_RANK.get(a.category) ?? SHOPPING_CATEGORIES.length) -
        (CATEGORY_RANK.get(b.category) ?? SHOPPING_CATEGORIES.length) ||
        a.name.localeCompare(b.name, 'de') || a.unit.localeCompare(b.unit, 'de');
}

const itemColumns = {
    id: shoppingListItems.id,
    name: shoppingListItems.name,
    quantity: shoppingListItems.quantity,
    unit: shoppingListItems.unit,
    category: shoppingListItems.category,
    checked: shoppingListItems.checked,
    alreadyHave: shoppingListItems.alreadyHave,
    manual: shoppingListItems.manual,
    quantityIncreased: shoppingListItems.quantityIncreased,
};

export type ShoppingItem = Pick<typeof shoppingListItems.$inferSelect, keyof typeof itemColumns>;

function shoppingQuantityIncreased(previous: SQLWrapper, current: SQLWrapper) {
    // Summation can change the last bits of a double when PostgreSQL visits rows in a different order.
    return sql<boolean>`(${current} - ${previous}) > greatest(abs(${current}), abs(${previous})) * ${16 * Number.EPSILON}`;
}

function itemWeek(ownerId: string, weekStart: string) {
    return and(eq(shoppingListItems.userId, ownerId), eq(shoppingListItems.weekStart, weekStart));
}

async function canEdit(tx: Transaction, viewerId: string, ownerId: string) {
    if (viewerId === ownerId) return true;

    // Keep the permission valid through the transaction, even if the owner revokes it concurrently.
    const [share] = await tx.select({ownerId: shoppingListShares.ownerId})
        .from(shoppingListShares)
        .where(and(eq(shoppingListShares.ownerId, ownerId), eq(shoppingListShares.memberId, viewerId)))
        .for('key share');
    return !!share;
}

function lockWeek(tx: Transaction, ownerId: string, weekStart: string) {
    return tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ownerId}), hashtext(${weekStart}))`);
}

async function reconcileRecipes(tx: Transaction, ownerId: string, weekStart: string) {
    const end = new Date(`${weekStart}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 6);
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
            eq(mealPlan.userId, ownerId),
            or(eq(recipes.visibility, 'public'), eq(recipes.userId, ownerId)),
            gte(mealPlan.date, weekStart),
            lte(mealPlan.date, end.toISOString().slice(0, 10))
        ))
        .groupBy(ingredients.name, ingredients.unit);

    const recipeItems = and(itemWeek(ownerId, weekStart), eq(shoppingListItems.manual, false));
    const previous = await tx.select(itemColumns).from(shoppingListItems).where(recipeItems);
    const byNameAndUnit = ({name, unit}: {name: string; unit: string}) => JSON.stringify([name, unit]);
    const wanted = new Set(aggregated.map(byNameAndUnit));
    const obsolete = previous.filter(item => !wanted.has(byNameAndUnit(item))).map(item => item.id);
    if (obsolete.length) {
        await tx.delete(shoppingListItems).where(inArray(shoppingListItems.id, obsolete));
    }

    const previousByName = new Map(previous.map(item => [byNameAndUnit(item), item]));
    const changes = aggregated.map(({name, quantity, unit}) => ({
        userId: ownerId,
        weekStart,
        name,
        quantity,
        unit,
        category: categorizeIngredient(name),
    })).filter((item) => {
        const old = previousByName.get(byNameAndUnit(item));
        return old?.quantity !== item.quantity || old?.category !== item.category;
    });
    if (!changes.length) return;

    const quantity = sql`excluded.quantity`;
    const increase = shoppingQuantityIncreased(shoppingListItems.quantity, quantity);
    await tx.insert(shoppingListItems)
        .values(changes)
        .onConflictDoUpdate({
            target: [
                shoppingListItems.userId,
                shoppingListItems.weekStart,
                shoppingListItems.name,
                shoppingListItems.unit,
                shoppingListItems.manual,
            ],
            set: {
                quantity,
                category: sql`excluded.category`,
                checked: sql`${shoppingListItems.checked} and not (${increase})`,
                alreadyHave: sql`${shoppingListItems.alreadyHave} and not (${increase})`,
                quantityIncreased: sql`${shoppingListItems.quantityIncreased} or ((${shoppingListItems.checked} or ${shoppingListItems.alreadyHave}) and (${increase}))`,
                updatedAt: new Date(),
            },
        });
}

export async function getWeeklyShoppingList(viewerId: string, ownerId: string, weekStart: string) {
    return getDb().transaction(async (tx) => {
        const accessible = await canEdit(tx, viewerId, ownerId);
        const sharedWith = await tx.select({id: user.id, username: user.username})
            .from(shoppingListShares)
            .innerJoin(user, eq(user.id, shoppingListShares.memberId))
            .where(eq(shoppingListShares.ownerId, viewerId))
            .orderBy(user.username);
        const sharedBy = await tx.select({id: user.id, username: user.username})
            .from(shoppingListShares)
            .innerJoin(user, eq(user.id, shoppingListShares.ownerId))
            .where(eq(shoppingListShares.memberId, viewerId))
            .orderBy(user.username);

        if (!accessible) return {items: [], sharedWith, sharedBy, accessible};
        await lockWeek(tx, ownerId, weekStart);
        await reconcileRecipes(tx, ownerId, weekStart);
        const items = await tx.select(itemColumns).from(shoppingListItems).where(itemWeek(ownerId, weekStart));
        return {items: items.sort(compareShoppingItems), sharedWith, sharedBy, accessible};
    });
}

async function editWeek<T>(viewerId: string, ownerId: string, weekStart: string, edit: (tx: Transaction) => Promise<T>) {
    return getDb().transaction(async (tx) => {
        if (!await canEdit(tx, viewerId, ownerId)) throw new Error('Shopping list is unavailable');
        await lockWeek(tx, ownerId, weekStart);
        return edit(tx);
    });
}

export async function addManualShoppingItem(viewerId: string, ownerId: string, weekStart: string, name: string) {
    await editWeek(viewerId, ownerId, weekStart, async (tx) => {
        await tx.insert(shoppingListItems)
            .values({userId: ownerId, weekStart, name, quantity: 1, unit: '', category: categorizeIngredient(name), manual: true})
            .onConflictDoNothing({
                target: [shoppingListItems.userId, shoppingListItems.weekStart, shoppingListItems.name, shoppingListItems.unit, shoppingListItems.manual],
            });
    });
}

export async function removeManualShoppingItem(viewerId: string, ownerId: string, weekStart: string, id: number) {
    await editWeek(viewerId, ownerId, weekStart, async (tx) => {
        await tx.delete(shoppingListItems).where(and(
            itemWeek(ownerId, weekStart),
            eq(shoppingListItems.id, id),
            eq(shoppingListItems.manual, true),
        ));
    });
}

export async function changeShoppingItemStatus(
    viewerId: string,
    ownerId: string,
    weekStart: string,
    id: number,
    current: Pick<ShoppingItem, 'quantity' | 'checked' | 'alreadyHave'>,
    status: Status,
) {
    const shownQuantity = sql`cast(${current.quantity} as double precision)`;
    const newerQuantity = shoppingQuantityIncreased(shownQuantity, shoppingListItems.quantity);

    return editWeek(viewerId, ownerId, weekStart, async (tx) => {
        await reconcileRecipes(tx, ownerId, weekStart);
        const [row] = await tx.update(shoppingListItems)
            .set({
                checked: status === 'bought',
                alreadyHave: status === 'have',
                quantityIncreased: status === 'open' ? undefined : false,
                updatedAt: new Date(),
            })
            .where(and(
                itemWeek(ownerId, weekStart),
                eq(shoppingListItems.id, id),
                eq(shoppingListItems.checked, current.checked),
                eq(shoppingListItems.alreadyHave, current.alreadyHave),
                status === 'open' ? undefined : sql`not (${newerQuantity})`,
            ))
            .returning({id: shoppingListItems.id});
        return !!row;
    });
}

export async function grantShoppingListAccess(ownerId: string, username: string) {
    const db = getDb();
    const [member] = await db.select({id: user.id}).from(user).where(eq(user.username, username));
    if (!member || member.id === ownerId) return false;

    await db.insert(shoppingListShares).values({ownerId, memberId: member.id}).onConflictDoNothing();
    return true;
}

export async function revokeShoppingListAccess(ownerId: string, memberId: string) {
    await getDb().delete(shoppingListShares)
        .where(and(eq(shoppingListShares.ownerId, ownerId), eq(shoppingListShares.memberId, memberId)));
}
