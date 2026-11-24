import {command, getRequestEvent, query} from "$app/server";
import * as v from "valibot";
import {updatePassword, updateUserEmail, deleteUserAccount, getUsers as getUsersFromDb, getUserById as getUserByIdFromDb, getLocaleByUserId as getLocaleByUserIdFromDb} from "$lib/server/db/user";
import {hashPassword} from "$lib/server/utils";
import {MIN_PASSWORD_LENGTH} from "$lib/utils";

const userIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(128));

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
    userId: userIdSchema,
    email: v.pipe(v.string(), v.email()),
}), async ({userId, email}) => {
    ensureAdmin();
    await updateUserEmail(userId, email);

    return {id: userId, email};
});

export const setUserPassword = command(v.object({
    userId: userIdSchema,
    password: v.pipe(
        v.string(),
        v.minLength(MIN_PASSWORD_LENGTH),
        v.maxLength(255)
    ),
}), async ({userId, password}) => {
    ensureAdmin();
    const passwordHash = await hashPassword(password);
    await updatePassword(userId, passwordHash);

    return {id: userId};
});

export const removeUser = command(v.object({
    userId: userIdSchema,
}), async ({userId}) => {
    const currentUser = ensureAdmin();

    if (currentUser.id === userId) {
        throw new Error('Administrators cannot delete their own account');
    }

    await deleteUserAccount(userId);

    return {id: userId};
});

export const getUsers = query(async () => {
    const {locals} = getRequestEvent();
    if (!locals.user?.administrator) {
        throw new Error('Not authorized');
    }
    return await getUsersFromDb();
});

export const getLocaleByUserId = query(v.object({
    userId: userIdSchema
}), async ({userId}) => {
    const {locals} = getRequestEvent();

    if (!locals.user) {
        throw new Error('User not authenticated');
    }

    if (locals.user.id !== userId && !locals.user.administrator) {
        throw new Error('User not authorized');
    }

    return await getLocaleByUserIdFromDb(userId);
});

export const getUserById = query(v.object({
    userId: userIdSchema
}), async ({userId}) => {
    const {locals} = getRequestEvent();

    if (!locals.user) {
        throw new Error('User not authenticated');
    }

    return await getUserByIdFromDb(userId);
});
