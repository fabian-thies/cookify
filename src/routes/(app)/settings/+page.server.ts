import type {RequestEvent} from "@sveltejs/kit";
import {fail, redirect} from "@sveltejs/kit";
import type {PageServerLoad} from "./$types";
import * as v from 'valibot';
import {saveProfile, updatePassword, deleteUserAccount, getUserPasswordHash} from "$lib/server/db/user";
import {hashPassword, verifyPassword} from "$lib/server/utils";
import {ImageUploadError, saveImage} from "$lib/server/image";
import {isUserLanguage} from "$lib/types/languages";
import type {UserLanguage} from "$lib/types/languages";
import {LANGUAGES} from "$lib/constants";
import {validatePassword, validateUsername} from "$lib/utils";
import {
    createSession,
    deleteSessionTokenCookie,
    generateSessionToken,
    invalidateSession,
    setSessionTokenCookie
} from "$lib/server/auth";
import {deletePasskey, getPasskeysByUserId} from "$lib/server/db/passkey";

export const load: PageServerLoad = async ({locals, parent}) => {
    await parent();
    if (!locals.user) {
        return {passkeys: []};
    }

    return {passkeys: await getPasskeysByUserId(locals.user.id)};
};

const ProfileSchema = v.object({
    username: v.pipe(v.string(), v.check((username) => validateUsername(username))),
    email: v.pipe(v.string(), v.email()),
    password: v.optional(v.string()),
    language: v.picklist(LANGUAGES)
});

export const actions = {
    save: async (event: RequestEvent) => {
        const {request, locals} = event;
        if (!locals.user) return fail(401);

        const formData = await request.formData();
        const rawLanguage = formData.get("language");
        if (!isUserLanguage(rawLanguage)) {
            return fail(400, {invalid: true});
        }

        const data = {
            username: String(formData.get("username") ?? ""),
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
            language: rawLanguage as UserLanguage,
        };
        const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

        let parsed: v.InferOutput<typeof ProfileSchema>;
        try {
            parsed = v.parse(ProfileSchema, data);
        } catch (e) {
            return fail(400, {invalid: true});
        }

        const isChangingPassword = Boolean(parsed.password && parsed.password.length > 0);
        const isChangingEmail = parsed.email !== locals.user.email;

        if (isChangingPassword) {
            if (!validatePassword(parsed.password) || parsed.password !== passwordConfirm) {
                return fail(400, {invalid: true});
            }
        }

        if (isChangingPassword || isChangingEmail) {
            const currentPassword = String(formData.get("currentPassword") ?? "");
            if (!currentPassword) {
                return fail(400, {invalid: true, currentPasswordRequired: true});
            }

            const storedHash = await getUserPasswordHash(locals.user.id);
            const validCurrentPassword = storedHash
                ? await verifyPassword(storedHash, currentPassword)
                : false;
            if (!validCurrentPassword) {
                return fail(403, {invalid: true, currentPasswordInvalid: true});
            }
        }

        const avatarInput = formData.get("avatar");
        let avatarUrl: string = locals.user.avatar ?? "";

        if (avatarInput && avatarInput instanceof File && avatarInput.size > 0) {
            try {
                avatarUrl = await saveImage(avatarInput);
            } catch (e) {
                if (e instanceof ImageUploadError) {
                    return fail(400, {invalid: true, avatarInvalid: true});
                }
                console.error("Avatar upload failed", e);
                return fail(500, {internalError: true, avatarUploadFailed: true});
            }
        }

        try {
            await saveProfile(
                locals.user.id,
                parsed.username,
                parsed.email,
                avatarUrl,
                parsed.language
            );

            if (isChangingPassword && parsed.password) {
                const passwordHash = await hashPassword(parsed.password);
                await updatePassword(locals.user.id, passwordHash);

                const newToken = generateSessionToken();
                const newSession = await createSession(newToken, locals.user.id);
                setSessionTokenCookie(event, newToken, newSession);
            }

            return {success: true};
        } catch (e) {
            console.error("Failed to save profile:", e);
            return fail(500, {internalError: true});
        }
    },
    deletePasskey: async ({request, locals}: RequestEvent) => {
        if (!locals.user) return fail(401);

        const id = String((await request.formData()).get("id") ?? "");
        if (!id) return fail(400);

        await deletePasskey(locals.user.id, id);

        return {success: true};
    },
    delete: async (event: RequestEvent) => {
        if (!event.locals.user) return fail(401);

        const formData = await event.request.formData();
        const currentPassword = String(formData.get("currentPassword") ?? "");
        if (!currentPassword) {
            return fail(400, {invalid: true, currentPasswordRequired: true});
        }

        const storedHash = await getUserPasswordHash(event.locals.user.id);
        const validCurrentPassword = storedHash
            ? await verifyPassword(storedHash, currentPassword)
            : false;
        if (!validCurrentPassword) {
            return fail(403, {invalid: true, currentPasswordInvalid: true});
        }

        try {
            await deleteUserAccount(event.locals.user.id);
        } catch (e) {
            console.error("Failed to delete account:", e);
            return fail(500, {internalError: true});
        }

        if (event.locals.session) {
            await invalidateSession(event.locals.session.id);
        }
        deleteSessionTokenCookie(event);

        throw redirect(303, '/login');
    }
};
