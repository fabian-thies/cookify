import type {RequestEvent} from "@sveltejs/kit";
import {fail, redirect} from "@sveltejs/kit";
import * as v from 'valibot';
import {saveProfile, updatePassword, deleteUserAccount} from "$lib/server/db/user";
import {hashPassword} from "$lib/server/utils";
import {saveImage} from "$lib/server/image";
import {isUserLanguage} from "$lib/types/languages";
import type {UserLanguage} from "$lib/types/languages";
import {LANGUAGES} from "$lib/constants";
import {deleteSessionTokenCookie, invalidateSession} from "$lib/server/auth";
import {deletePasskey, getPasskeysByUserId} from "$lib/server/db/passkey";

export const load = async ({locals}: RequestEvent) => {
    return {passkeys: await getPasskeysByUserId(locals.user!.id)};
};

const ProfileSchema = v.object({
    username: v.string(),
    email: v.pipe(v.string(), v.email()),
    password: v.optional(v.string()),
    language: v.picklist(LANGUAGES)
});

export const actions = {
    save: async ({request, locals}: RequestEvent) => {
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

        let parsed: v.InferOutput<typeof ProfileSchema>;
        try {
            parsed = v.parse(ProfileSchema, data);
        } catch (e) {
            return fail(400, {invalid: true});
        }

        const avatarInput = formData.get("avatar");
        let avatarUrl: string = locals.user.avatar ?? "";

        if (avatarInput && avatarInput instanceof File && avatarInput.size > 0) {
            try {
                avatarUrl = await saveImage(avatarInput);
            } catch (e) {
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

            if (parsed.password && parsed.password.length > 0) {
                const passwordHash = await hashPassword(parsed.password);
                await updatePassword(locals.user.id, passwordHash);
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
