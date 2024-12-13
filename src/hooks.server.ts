import {type Handle, redirect} from "@sveltejs/kit";
import {verifyJWT} from "$lib/server/utils/auth";

export const handle: Handle = async ({event, resolve}) => {
    if (event.url.pathname == "/login" || event.url.pathname == "/register") {
        return resolve(event);
    }

    const authToken: string = String(event.cookies.get("token"));
    const jwtPayload = await verifyJWT(authToken);

    if (!jwtPayload.isValid) {
        redirect(303, "/login")
    }

    return resolve(event);
}