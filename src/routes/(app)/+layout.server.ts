import * as auth from '$lib/server/auth';
import {redirect} from '@sveltejs/kit';
import {getRequestEvent} from '$app/server';
import type {PublicUser} from "$lib/server/db/schema";

export const load = async (): Promise<{ user: PublicUser }> => {
	const user = requireLogin();

	return { user };
};

function requireLogin(): PublicUser {
    const { locals, url } = getRequestEvent();

    if (!locals.user && url.pathname !== "/login") {
        throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
    }

    return locals.user!;
}