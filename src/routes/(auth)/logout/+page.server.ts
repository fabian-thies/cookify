import {type Actions, fail, redirect} from "@sveltejs/kit";
import * as auth from "$lib/server/auth";

export const actions: Actions = {
    default: async (event) => {
        if (!event.locals.session) {
            throw redirect(302, '/login');
        }
        await auth.invalidateSession(event.locals.session.id);
        auth.deleteSessionTokenCookie(event);

        throw redirect(302, '/login');
    }
};