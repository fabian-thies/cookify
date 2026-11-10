import {command, getRequestEvent, query} from "$app/server";
import * as v from "valibot";
import {toggleRecipeFavorite} from "$lib/server/db/recipe";
import {
    updateAllowRegistrations as updateAllowRegistrationsDb,
    getAllowRegistrations as getAllowRegistrationsFromDb,
    updateAiEnabled as updateAiEnabledDb
} from "$lib/server/db/site";

export const updateAllowRegistrations = command(v.object({
    value: v.boolean()
}), async ({value}) => {
    const {locals} = getRequestEvent();
    const user = locals.user;
    const userId = user?.id;

    if (!userId) {
        throw new Error('User not authenticated');
    }

    if (!user || !user.administrator) {
        throw new Error('User not authorized');
    }

    return await updateAllowRegistrationsDb(value);
});

export const getAllowRegistrations = query(async () => {
    return await getAllowRegistrationsFromDb();
});

export const updateAiEnabled = command(v.object({
    value: v.boolean()
}), async ({value}) => {
    const {locals} = getRequestEvent();
    const user = locals.user;

    if (!user) {
        throw new Error('User not authenticated');
    }

    if (!user.administrator) {
        throw new Error('User not authorized');
    }

    return await updateAiEnabledDb(value);
});