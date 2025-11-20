import {error} from "@sveltejs/kit";

export const load = async ({locals}) => {
    if (!locals.user?.administrator) {
        return error(401, 'Unauthorized');
    }
}
