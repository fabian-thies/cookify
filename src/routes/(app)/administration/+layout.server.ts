import {error} from "@sveltejs/kit";
import {getDb} from "$lib/server/db";
import {user} from "$lib/server/db/schema";

export const load = async ({locals}) => {
    if (!locals.user?.administrator) {
        return error(401, 'Unauthorized');
    }
}