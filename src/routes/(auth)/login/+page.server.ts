import {type Actions, fail, redirect} from '@sveltejs/kit';
import {createSession, getUserByEmail} from "$lib/server/db/queries/user";
import bcrypt from "bcrypt";

export const actions = {
    default: async ({request, cookies}) => {
        const data = await request.formData();
        const email = String(data.get('email'));
        const password = String(data.get('password'));

        if (!email || !password) {
            return fail(400, {message: {error: 'Bitte alle Felder ausfüllen.'}});
        }

        const user = await getUserByEmail(email);

        if (!user.success) {
            return fail(400, {message: {error: 'Der Benutzername oder das Passwort ist falsch.'}})
        }

        const isPasswordValid = await bcrypt.compare(password, user.data.passwordHash);

        if (isPasswordValid) {
            const sessionToken = await createSession(user.data.id);

            if(!sessionToken.success) {
                return fail(400, {message: {error: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'}});
            }

            const token = sessionToken.data;

            cookies.set('session', token, {
                httpOnly: true,
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });

            return redirect(303, '/');
        }

        return fail(400, {message: {error: 'Der Benutzername oder das Passwort ist falsch.'}})
    }
} satisfies Actions;

