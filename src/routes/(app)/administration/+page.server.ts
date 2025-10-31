import {getUsers} from "$lib/server/db/user";

export const load = async () => {
    const users = await getUsers();

    return {users}
};

