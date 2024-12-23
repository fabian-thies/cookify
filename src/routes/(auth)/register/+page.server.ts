import {fail, redirect} from '@sveltejs/kit';
import {createSession, createUser} from "$lib/server/db/queries/user";

export const actions = {
    default: async ({request, cookies}) => {
        const data = await request.formData();

        const email = String(data.get('email'));
        const password = String(data.get('password'));
        const username = String(data.get('username'));

        if (!email || !password) {
            return fail(400, {message: {error: 'Bitte alle Felder ausfüllen.'}});
        }

        if (password.toString().length < 8) {
            return fail(400, {message: {error: 'Das Passwort muss mindestens 8 Zeichen lang sein.'}});
        }

        const userId = await createUser(username, email, password);

        if (!userId.success) {
            return fail(400, {message: {error: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.'}});
        }

        const sessionToken = await createSession(userId.data);

        if (!sessionToken.success) {
            return fail(400, {message: {error: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'}});
        }

        cookies.set('session', sessionToken.data, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        });

        return redirect(303, '/');
    }
};



