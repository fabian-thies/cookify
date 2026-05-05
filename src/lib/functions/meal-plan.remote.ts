import * as v from 'valibot';
import { command, getRequestEvent, query } from '$app/server';
import {
    addToMealPlan as addToMealPlanDb,
    removeFromMealPlan as removeFromMealPlanDb,
    getMealPlan as getMealPlanDb,
} from '$lib/server/db/meal-plan';

export const addToMealPlan = command(v.object({
    recipeId: v.number(),
    date: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/)),
}), async ({ recipeId, date }) => {
    const { locals } = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    return await addToMealPlanDb(userId, recipeId, date);
});

export const removeFromMealPlan = command(v.object({
    mealPlanId: v.number(),
}), async ({ mealPlanId }) => {
    const { locals } = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    await removeFromMealPlanDb(mealPlanId, userId);
});

export const getMealPlan = query(v.object({
    startDate: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/)),
    endDate: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/)),
}), async ({ startDate, endDate }) => {
    const { locals } = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    return await getMealPlanDb(userId, startDate, endDate);
});
