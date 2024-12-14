import {fail, redirect} from '@sveltejs/kit';
import {getUserByEmail} from "$lib/server/db/queries/user";
import bcrypt from "bcrypt";
import {signJWT} from "$lib/server/utils/auth";

export const actions = {
    default: async ({request, cookies}) => {
        const data = await request.formData();
        const email = String(data.get('email'));
        const password = String(data.get('password'));

        if (!email || !password) {
            return fail(400, {formError: {error: 'Bitte alle Felder ausfüllen.'}});
        }

        const user = await getUserByEmail(email);

        if (!user) {
            return fail(400, {formError: {error: 'Der Benutzername oder das Passwort ist falsch.'}})
        }

        const isPasswordValid = await bcrypt.compare(password, user?.passwordHash);

        if (isPasswordValid) {
            const token = await signJWT(user.id.toString(), user.username, user.email);

            cookies.set('token', token, {
                httpOnly: true,
                maxAge: 60 * 60 * 24 * 7,
                path: '/'
            });

            return redirect(303, '/');
        }

        return fail(400, {formError: {error: 'Der Benutzername oder das Passwort ist falsch.'}})
    }
};

