import {type Actions, fail, redirect} from "@sveltejs/kit";
import * as auth from "$lib/server/auth";
import type {PageServerLoad} from "../../../.svelte-kit/types/src/routes/(auth)/login/$types";
import {getDifficulties, getRecipes} from "$lib/server/db/recipe";

export const load: PageServerLoad = async (event) => {
    const recipes = await getRecipes();
    const difficulties = await getDifficulties();

    return {recipes, difficulties};
}

export const actions: Actions = {
    logout: async (event) => {
        if (!event.locals.session) {
            return fail(401);
        }
        await auth.invalidateSession(event.locals.session.id);
        auth.deleteSessionTokenCookie(event);

        return redirect(302, '/login');
    },
};