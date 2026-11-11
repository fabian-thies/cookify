import {sequence} from '@sveltejs/kit/hooks';
import * as auth from '$lib/server/auth';
import type {Handle} from '@sveltejs/kit';
import {paraglideMiddleware} from '$lib/paraglide/server';
import {env} from '$env/dynamic/private';
import {resolveAppLocale} from '$lib/server/locale';

const handleParaglide: Handle = async ({event, resolve}) => {
    const locale = resolveAppLocale(env.DEFAULT_LOCALE, event.cookies.get('PARAGLIDE_LOCALE'), event.locals.user?.language);
    event.cookies.set('PARAGLIDE_LOCALE', locale, {
        path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365
    });
    // Paraglide must see the chosen locale before it creates the request context.
    const headers = new Headers(event.request.headers);
    headers.set('cookie', event.cookies.getAll().map(({name, value}) => `${name}=${encodeURIComponent(value)}`).join('; '));
    const localizedRequest = new Request(event.request, {headers});
    return paraglideMiddleware(localizedRequest, ({request, locale}) => {
        event.request = request;
        return resolve(event, {
            transformPageChunk: ({html}) => html.replace('%paraglide.lang%', locale)
        });
    });
};

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
