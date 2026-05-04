import {command, getRequestEvent, query} from "$app/server";
import * as v from "valibot";
import {updatePassword, updateUserEmail, deleteUserAccount, getUsers as getUsersFromDb, getUserById as getUserByIdFromDb, getLocaleByUserId as getLocaleByUserIdFromDb, saveProfile as saveProfileInDb, updatePassword as updatePasswordInDb, deleteUserAccount as deleteUserAccountFromDb} from "$lib/server/db/user";
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

export const getUsers = query(async () => {
    const {locals} = getRequestEvent();
    if (!locals.user?.administrator) {
        throw new Error('Not authorized');
    }
    return await getUsersFromDb();
});

export const getLocaleByUserId = query(v.object({
    userId: v.string()
}), async ({userId}) => {
    return await getLocaleByUserIdFromDb(userId);
});

export const getUserById = query(v.object({
    userId: v.string()
}), async ({userId}) => {
    const {locals} = getRequestEvent();

    if (!locals.user) {
        throw new Error('User not authenticated');
    }

    return await getUserByIdFromDb(userId);
});

export const saveProfile = command(v.object({
    username: v.pipe(v.string(), v.minLength(1)),
    email: v.pipe(v.string(), v.email()),
    avatar: v.string(),
    language: v.picklist(['en', 'de', 'es'])
}), async (data) => {
    const {locals} = getRequestEvent();

    if (!locals.user) {
        throw new Error('User not authenticated');
    }

    return await saveProfileInDb(
        locals.user.id,
        data.username,
        data.email,
        data.avatar,
        data.language
    );
});

export const updateUserPassword = command(v.object({
    password: v.pipe(v.string(), v.minLength(6), v.maxLength(255))
}), async ({password}) => {
    const {locals} = getRequestEvent();

    if (!locals.user) {
        throw new Error('User not authenticated');
    }

    const hash = await hashPassword(password);
    return await updatePasswordInDb(locals.user.id, hash);
});

export const deleteOwnAccount = command(v.object({}), async () => {
    const {locals} = getRequestEvent();

    if (!locals.user) {
        throw new Error('User not authenticated');
    }

    return await deleteUserAccountFromDb(locals.user.id);
});
