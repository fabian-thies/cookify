import {type Handle, redirect} from "@sveltejs/kit";
import {getUserBySessionToken} from "$lib/server/db/queries/user";

export const handle: Handle = async ({event, resolve}) => {
    const sessionCookie = event.cookies.get("session");
    const pathIsLogin: Boolean = event.url.pathname == "/login";
    const pathIsRegister: Boolean = event.url.pathname == "/register";

    if (pathIsLogin || pathIsRegister) {
        return resolve(event);
    }

    if (!sessionCookie) {
        redirect(303, "/login");
    }

    const user = await getUserBySessionToken(sessionCookie);

    if (!user.success) {
        event.cookies.set('session', '', {
            path: "/",
            expires: new Date(0),
        });

        redirect(303, "/login");
    }

    event.locals.user = {
        id: user.data.id,
        email: user.data.email,
        username: user.data.username,
    }

    return resolve(event);
}