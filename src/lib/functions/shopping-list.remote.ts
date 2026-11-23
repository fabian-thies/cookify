import {command, getRequestEvent, query} from '$app/server';
import {error} from '@sveltejs/kit';
import * as v from 'valibot';
import {
    addManualShoppingItem,
    changeShoppingItemStatus,
    getWeeklyShoppingList,
    grantShoppingListAccess,
    removeManualShoppingItem,
    revokeShoppingListAccess,
} from '$lib/server/db/shopping-list';

function signedInUserId() {
    const id = getRequestEvent().locals.user?.id;
    if (!id) throw error(401, 'User not authenticated');
    return id;
}

const accountId = v.pipe(v.string(), v.minLength(1), v.maxLength(100));
const itemId = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(2_147_483_647));
const weekScope = {
    ownerId: v.optional(accountId),
    weekStart: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/), v.check((value) => {
        const monday = new Date(`${value}T00:00:00Z`);
        return monday.getUTCFullYear() > 0 && monday.getUTCFullYear() < 9999 &&
            monday.getUTCDay() === 1 && monday.toISOString().slice(0, 10) === value;
    })),
};

export const getShoppingList = query(v.object(weekScope), async ({ownerId, weekStart}) => {
    const viewer = signedInUserId();
    return getWeeklyShoppingList(viewer, ownerId ?? viewer, weekStart);
});

export const addShoppingItem = command(v.object({
    ...weekScope,
    name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
}), async ({ownerId, weekStart, name}) => {
    const viewer = signedInUserId();
    await addManualShoppingItem(viewer, ownerId ?? viewer, weekStart, name);
});

export const removeShoppingItem = command(v.object({...weekScope, itemId}), async ({ownerId, weekStart, itemId}) => {
    const viewer = signedInUserId();
    await removeManualShoppingItem(viewer, ownerId ?? viewer, weekStart, itemId);
});

export const setShoppingItemStatus = command(v.object({
    ...weekScope,
    itemId,
    quantity: v.pipe(v.number(), v.finite(), v.minValue(0)),
    checked: v.boolean(),
    alreadyHave: v.boolean(),
    status: v.picklist(['open', 'bought', 'have']),
}), async ({ownerId, weekStart, itemId, status, quantity, checked, alreadyHave}) => {
    const viewer = signedInUserId();
    return changeShoppingItemStatus(viewer, ownerId ?? viewer, weekStart, itemId, {quantity, checked, alreadyHave}, status);
});

export const shareShoppingList = command(v.object({
    username: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
}), ({username}) => {
    return grantShoppingListAccess(signedInUserId(), username);
});

export const unshareShoppingList = command(v.object({memberId: accountId}), async ({memberId}) => {
    await revokeShoppingListAccess(signedInUserId(), memberId);
});
