import * as auth from '$lib/server/auth';
import {type Actions, fail, redirect} from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import type {PageServerLoad} from "../../.svelte-kit/types/src/routes/$types";

export const load: PageServerLoad = async () => {
	const user = requireLogin()
	return { user };
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

function requireLogin() {
  const { locals } = getRequestEvent();

  if (!locals.user) {
    return redirect(302, "/login");
  }

  return locals.user;
}
