import {verify} from '@node-rs/argon2';
import {encodeBase32LowerCase} from '@oslojs/encoding';
import {type Actions, fail, redirect} from '@sveltejs/kit';
import {eq} from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import {getDb} from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {PageServerLoad} from "./$types";
import {validateEmail, validatePassword, validateUsername} from "$lib/utils";
import {hashPassword} from "$lib/server/utils";
import {getAllowRegistrations} from "$lib/server/db/site";

export const load: PageServerLoad = async (event) => {
    if (event.locals.user) {
        return redirect(302, '/');
    }

    const allowRegistrations = await getAllowRegistrations();

    return {allowRegistrations};
};

export const actions: Actions = {
    login: async (event) => {
        const formData = await event.request.formData();
        const username = formData.get('username');
        const password = formData.get('password');
        const redirectTo = formData.get('redirectTo');

        if (!validateUsername(username)) {
            return fail(400, {message: 'Invalid username (min 3, max 31 characters, alphanumeric only)'});
        }
        if (!validatePassword(password)) {
            return fail(400, {message: 'Invalid password (min 6, max 255 characters)'});
        }

        const db = getDb();
        const results = await db
            .select()
            .from(table.user)
            .where(eq(table.user.username, username));

        const existingUser = results.at(0);
        if (!existingUser) {
            return fail(400, {message: 'Incorrect username or password'});
        }

        const validPassword = await verify(existingUser.passwordHash, password, {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1,
        });
        if (!validPassword) {
            return fail(400, {message: 'Incorrect username or password'});
        }

        const sessionToken = auth.generateSessionToken();
        const session = await auth.createSession(sessionToken, existingUser.id);
        auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

        if (redirectTo && typeof redirectTo === 'string' && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
            return redirect(302, redirectTo);
        }

        return redirect(302, '/');
    },
    register: async (event) => {
        const formData = await event.request.formData();
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const redirectTo = formData.get('redirectTo');

        const allowRegistrations = await getAllowRegistrations();
        if (!allowRegistrations) {
            return fail(403, {message: 'Registrations are currently disabled.'});
        }

        if (!validateUsername(username)) {
            return fail(400, {message: 'Invalid username'});
        }
        if (!validatePassword(password)) {
            return fail(400, {message: 'Invalid password'});
        }
        if (password != confirmPassword) {
            return fail(400, {message: 'Passwords do not match'})
        }
        if (!validateEmail(email)) {
            return fail(400, {message: 'Invalid email'})
        }

        const userId = generateUserId();
        const passwordHash = await hashPassword(password);
        const db = getDb();

        try {
            await db.insert(table.user).values({id: userId, username, passwordHash, email});

            const sessionToken = auth.generateSessionToken();
            const session = await auth.createSession(sessionToken, userId);
            auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
        } catch(e: unknown) {
            const pgCode = (e as any)?.cause?.code as string | undefined;
            const constraint = (e as any)?.cause?.constraint_name as string | undefined;

            if (pgCode === "23505") {
                if(constraint === "user_email_unique") {
                    return fail(400, {message: 'This email address is already registered.'});
                }
                if(constraint === "user_username_unique") {
                    return fail(400, {message: 'Dieser Benutzername ist bereits vergeben.'});
                }

                return fail(400, {message: 'An entry with this data already exists.'});
            }

            console.error('Registration failed:', e);
            return fail(500, {message: 'An error has occurred'});
        }

        if (redirectTo && typeof redirectTo === 'string' && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
            return redirect(302, redirectTo);
        }

        return redirect(302, '/');
    },
};

function generateUserId() {
    // ID with 120 bits of entropy, or about the same as UUID v4.
    const bytes = crypto.getRandomValues(new Uint8Array(15));
    return encodeBase32LowerCase(bytes);
}
