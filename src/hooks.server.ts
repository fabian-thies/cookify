import {sequence} from '@sveltejs/kit/hooks';
import * as auth from '$lib/server/auth';
import type {Handle} from '@sveltejs/kit';
import {paraglideMiddleware} from '$lib/paraglide/server';
import {setLocale} from "$lib/paraglide/runtime";
import {getLocaleByUserId} from "$lib/server/db/user";

const handleParaglide: Handle = async ({event, resolve}) => paraglideMiddleware(event.request, async ({
                                                                                                          request,
                                                                                                          locale
                                                                                                      }) => {
    event.request = request;

    if (event.cookies.get("PARAGLIDE_LOCALE") && event.locals.user) {
        const currentLocale = await getLocaleByUserId(event.locals.user.id);

        event.cookies.set('PARAGLIDE_LOCALE', currentLocale, {
            path: '/',
            httpOnly: false,
            sameSite: 'lax'
        });
    }

    return resolve(event, {
        transformPageChunk: ({html}) => html.replace('%paraglide.lang%', locale)
    });
});

const handleAuth: Handle = async ({event, resolve}) => {
    const sessionToken = event.cookies.get(auth.sessionCookieName);

    if (!sessionToken) {
        event.locals.user = null;
        event.locals.session = null;
        return resolve(event);
    }

    const {session, user} = await auth.validateSessionToken(sessionToken);

    if (session) {
        auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
    } else {
        auth.deleteSessionTokenCookie(event);
    }

    event.locals.user = user;
    event.locals.session = session;
    return resolve(event);
};

export const handle: Handle = sequence(handleAuth, handleParaglide);
