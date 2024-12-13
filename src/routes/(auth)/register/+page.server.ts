import {fail, redirect} from '@sveltejs/kit';
import {signJWT} from "$lib/server/utils/auth";
import {createUser} from "$lib/server/db/queries/user";

export const actions = {
    default: async ({request, cookies}) => {
        const data = await request.formData();

        const email = String(data.get('email'));
        const password = String(data.get('password'));
        const username = String(data.get('username'));

        if (!email || !password) {
            return fail(400, {formError: {error: 'Bitte alle Felder ausfüllen.'}});
        }

        if (password.toString().length < 8) {
            return fail(400, {formError: {error: 'Das Passwort muss mindestens 8 Zeichen lang sein.'}});
        }

        const userId: string = createUser(username, email, password).toString();
        const token = await signJWT(userId, username);

        cookies.set('token', token, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        });

        return redirect(303, '/');
    }
};



