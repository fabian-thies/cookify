import type {PageServerLoad} from './$types';
import {type Actions, error, fail, redirect} from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import type {Recipe} from "$lib/server/db/schema";

type RecipesResponse = {
    success: boolean;
    recipes: Recipe[];
    pagination: {
        page: number;
        limit: number;
        hasNextPage: boolean;
    };
};

type SavedStatusResponse = {
    saved: { userId: string, recipeId: number }[];
};

export const load: PageServerLoad = async ({url, locals, fetch}) => {
    const search = url.searchParams.get('search') ?? '';
    const page = url.searchParams.get('page') ?? '';

    const recipesRes = await fetch(
        `/api/v1/recipes?search=${encodeURIComponent(search)}&page=${encodeURIComponent(page)}`
    );
    if (!recipesRes.ok) throw error(recipesRes.status, 'Fehler beim Laden der Rezepte');

    const recipesData = await recipesRes.json() as RecipesResponse;

    const savedRes = await fetch('/api/v1/recipes/saved-status');
    if (!savedRes.ok) throw error(savedRes.status, 'Fehler beim Laden des Saved-Status');

    const savedData = await savedRes.json() as SavedStatusResponse;

    const recipes = recipesData.recipes.map(r => ({
        ...r,
        isSaved: savedData.saved.some(s => s.recipeId === r.id)}));

    return {
        user: locals.user,
        search,
        recipes,
        pagination: recipesData.pagination,
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
