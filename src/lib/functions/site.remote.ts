import {command, getRequestEvent} from "$app/server";
import * as v from "valibot";
import {toggleRecipeFavorite} from "$lib/server/db/recipe";
import {updateAllowRegistrations as updateAllowRegistrationsDb} from "$lib/server/db/site";

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