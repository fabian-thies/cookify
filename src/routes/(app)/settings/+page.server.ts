import type {RequestEvent} from "@sveltejs/kit";
import {fail} from "@sveltejs/kit";
import * as v from 'valibot';
import {saveProfile} from "$lib/server/db/user";
import {saveImage} from "$lib/server/utils";

const ProfileSchema = v.object({
    username: v.string(),
    email: v.pipe(v.string(), v.email())
});

export const actions = {
    save: async ({request, locals}: RequestEvent) => {
        if (!locals.user) return fail(401);

        const formData = await request.formData();
        const data = {
            username: String(formData.get("username") ?? ""),
            email: String(formData.get("email") ?? "")
        };

        let parsed;
        try {
            parsed = v.parse(ProfileSchema, data);
        } catch (e) {
            return fail(400, {invalid: true});
        }

        const avatarInput = formData.get("avatar");
        let avatarUrl: string = locals.user.avatar ?? "";

        if(avatarInput && avatarInput instanceof File && avatarInput.size > 0) {
            try {
                avatarUrl = await saveImage(avatarInput);
            } catch (e) {
                console.error("Avatar upload failed", e);
                return fail(500, {internalError: true, avatarUploadFailed: true});
            }
        }

        await saveProfile(locals.user.id, parsed.username, parsed.email, avatarUrl);
    }
};