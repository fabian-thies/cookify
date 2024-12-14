import {redirect} from "@sveltejs/kit";

export const load = async ({cookies}) => {
    cookies.set("token", "", {
        path: "/",
        expires: new Date(Date.now())
    })

    redirect(303, "/")
}