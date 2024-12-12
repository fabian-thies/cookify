import {fail, redirect} from '@sveltejs/kit';

export const actions = {
    default: async ({request}) => {
        const data = await request.formData();
        const email = data.get('email');
        const password = data.get('password');

        if (!email || !password) {
            return fail(400, {formError: {error: 'Bitte alle Felder ausfüllen.'}});
        }

        if(password.toString().length < 8) {
            return fail(400, {formError: {error: 'Das Passwort muss mindestens 8 Zeichen lang sein.'}});
        }

        return redirect(303, '/');
    }
};

