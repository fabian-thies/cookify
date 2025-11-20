import {getUsers} from "$lib/server/db/user";
import {getAllowRegistrations} from "$lib/server/db/site";

export const load = async () => {
    const [users, allowRegistrations] = await Promise.all([getUsers(), getAllowRegistrations()]);

    return {users, allowRegistrations}
};
