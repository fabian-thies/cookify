import type {PageServerLoad} from './$types';
import {type Actions, error, fail, redirect} from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import type {Recipe} from "$lib/server/db/schema";

export const load: PageServerLoad = async ({url, locals, fetch}) => {
    const search = url.searchParams.get('search') ?? '';
    const page = url.searchParams.get('page') ?? '';

    const res = await fetch(`/api/recipes?search=${encodeURIComponent(search)}&page=${encodeURIComponent(page)}`);

    if (!res.ok) {
        throw error(res.status, 'Fehler beim Laden der Rezepte');
    }

    const payload = await res.json() as {
        success: boolean;
        recipes: Recipe[];
        pagination: { page: number; limit: number, hasNextPage: boolean };
    };

    const recipes = payload.recipes;
    const pagination = payload.pagination;

    return {
        user: locals.user,
        search,
        recipes,
        pagination
    };
};


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
