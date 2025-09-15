import type {RequestEvent} from "@sveltejs/kit";
import {fail} from "@sveltejs/kit";
import * as v from 'valibot';
import {saveProfile} from "$lib/server/db/user";

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

        const avatar = String(formData.get("avatar"));

        await saveProfile(locals.user.id, parsed.username, parsed.email, avatar);

        return {success: true};
    }
};