import {command, getRequestEvent} from "$app/server";
import * as v from "valibot";
import {updatePassword, updateUserEmail, deleteUserAccount} from "$lib/server/db/user";
import {hashPassword} from "$lib/server/utils";

function ensureAdmin() {
    const {locals} = getRequestEvent();
    const user = locals.user;

    if (!user) {
        throw new Error('User not authenticated');
    }

    if (!user.administrator) {
        throw new Error('User not authorized');
    }

    return user;
}

export const setUserEmail = command(v.object({
    userId: v.string(),
    email: v.pipe(v.string(), v.email()),
}), async ({userId, email}) => {
    ensureAdmin();
    await updateUserEmail(userId, email);

    return {id: userId, email};
});

export const setUserPassword = command(v.object({
    userId: v.string(),
    password: v.pipe(
        v.string(),
        v.minLength(6),
        v.maxLength(255)
    ),
}), async ({userId, password}) => {
    ensureAdmin();
    const passwordHash = await hashPassword(password);
    await updatePassword(userId, passwordHash);

    return {id: userId};
});

export const removeUser = command(v.object({
    userId: v.string(),
}), async ({userId}) => {
    const currentUser = ensureAdmin();

    if (currentUser.id === userId) {
        throw new Error('Administrators cannot delete their own account');
    }

    await deleteUserAccount(userId);

    return {id: userId};
});
