import {type Handle} from '@sveltejs/kit';
import * as auth from '$lib/server/auth.js';

function redirect(location: string, body?: string) {
    return new Response(body, {
        status: 303,
        headers: { location }
    });
}

const unProtectedRoutes = ['/login']

const handleAuth: Handle = async ({event, resolve}) => {
    const sessionToken = event.cookies.get(auth.sessionCookieName);

    if (!sessionToken && !unProtectedRoutes.includes(event.url.pathname)) {
        event.locals.user = null;
        event.locals.session = null;

        return redirect('/login')
    }

    const {session, user} = await auth.validateSessionToken(sessionToken || '');

    if (session) {
        auth.setSessionTokenCookie(event, sessionToken || '', session.expiresAt);
    } else {
        auth.deleteSessionTokenCookie(event);
    }

    event.locals.user = user;
    event.locals.session = session;
    return resolve(event);
};

export const handle: Handle = handleAuth;