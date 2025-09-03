import * as auth from '$lib/server/auth';
import {type Actions, fail, redirect} from '@sveltejs/kit';
import {getRequestEvent} from '$app/server';

export const load = async () => {
	const user = requireLogin()
	return { user };
};

function requireLogin() {
    const { locals, url } = getRequestEvent();

    if (!locals.user && url.pathname !== "/login") {
        throw redirect(302, "/login");
    }

    return locals.user;
}