import * as auth from '$lib/server/auth';
import {redirect} from '@sveltejs/kit';
import {getRequestEvent} from '$app/server';
import type {PublicUser} from "$lib/server/db/schema";
import {getAiEnabled} from '$lib/server/db/site';
import {isAiConfigured} from '$lib/server/ai';

export const load = async (): Promise<{ user: PublicUser; ai: { configured: boolean; enabled: boolean } }> => {
    const user = requireLogin();

    return {
        user,
        ai: {
            configured: isAiConfigured(),
            enabled: isAiConfigured() && await getAiEnabled()
        }
    };
};

function requireLogin(): PublicUser {
    const {locals, url} = getRequestEvent();

    if (!locals.user && url.pathname !== "/login") {
        throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
    }

    return locals.user!;
}