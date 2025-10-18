import type {RequestEvent} from "@sveltejs/kit";
import {fail} from "@sveltejs/kit";
import * as v from 'valibot';
import {saveProfile, updatePassword} from "$lib/server/db/user";
import {hashPassword, saveImage} from "$lib/server/utils";
import {isUserLanguage} from "$lib/types/languages";
import type {UserLanguage} from "$lib/types/languages";
import {LANGUAGES} from "$lib/constants";

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

        await saveProfile(locals.user.id, parsed.username, parsed.email, avatarUrl, parsed.language);

        if (parsed.password && parsed.password.length > 0) {
            await updatePassword(locals.user.id, await hashPassword(parsed.password))
        }
    }
};