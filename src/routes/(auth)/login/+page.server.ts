import {getLocale} from '$lib/paraglide/runtime';
import {verify} from '@node-rs/argon2';
import {encodeBase32LowerCase} from '@oslojs/encoding';
import {type Actions, fail, redirect} from '@sveltejs/kit';
import {eq} from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import {getDb} from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {PageServerLoad} from "./$types";
import {
    LEGACY_MIN_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
    sanitizeRedirectPath,
    validateEmail,
    validateLoginPassword,
    validatePassword,
    validateUsername
} from "$lib/utils";
import {hashPassword} from "$lib/server/utils";
import {getAllowRegistrations} from "$lib/functions/site.remote";
import {
    checkLoginRateLimit,
    checkRegisterRateLimit,
    getClientIp,
    resetLoginUserRateLimit
} from "$lib/server/auth-rate-limit";

const ARGON2_VERIFY_OPTIONS = {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
};

// Precomputed valid Argon2id hash with identical parameters for constant-time login checks
// when the requested username does not exist.
const DUMMY_PASSWORD_HASH =
    '$argon2id$v=19$m=19456,t=2,p=1$FUa0Z0WDYYJSxKKJJW7Edw$/8mc/aAPdP5X9XHa9Ixito7+h8JtY/6NaluKiL75ZPU';

export const load: PageServerLoad = async (event) => {
    if (event.locals.user) {
        return redirect(302, '/');
    }
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
        if (!validateLoginPassword(password)) {
            return fail(400, {message: `Invalid password (min ${LEGACY_MIN_PASSWORD_LENGTH}, max 255 characters)`});
        }
        if (!checkLoginRateLimit(getClientIp(event), username)) {
            return fail(429, {message: 'Too many login attempts. Please try again later.'});
        }

        const db = getDb();
        const results = await db
            .select()
            .from(table.user)
            .where(eq(table.user.username, username));

        const existingUser = results.at(0);
        const validPassword = await verify(
            existingUser?.passwordHash ?? DUMMY_PASSWORD_HASH,
            password,
            ARGON2_VERIFY_OPTIONS
        );
        if (!existingUser || !validPassword) {
            return fail(400, {message: 'Incorrect username or password'});
        }

        resetLoginUserRateLimit(username);

        const sessionToken = auth.generateSessionToken();
        const session = await auth.createSession(sessionToken, existingUser.id);
        auth.setSessionTokenCookie(event, sessionToken, session);

        return redirect(302, sanitizeRedirectPath(redirectTo, event.url.origin));
    },
    register: async (event) => {
        if (!checkRegisterRateLimit(getClientIp(event))) {
            return fail(429, {message: 'Too many registration attempts. Please try again later.'});
        }

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
            return fail(400, {message: `Invalid password (min ${MIN_PASSWORD_LENGTH}, max 255 characters)`});
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
            // First registered user automatically becomes administrator
            const existingUsers = await db.select().from(table.user).limit(1);
            const isFirstUser = existingUsers.length === 0;

            await db.insert(table.user).values({
                id: userId,
                username,
                passwordHash,
                email,
                administrator: isFirstUser,
                language: getLocale()
            });

            const sessionToken = auth.generateSessionToken();
            const session = await auth.createSession(sessionToken, userId);
            auth.setSessionTokenCookie(event, sessionToken, session);
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

        return redirect(302, sanitizeRedirectPath(redirectTo, event.url.origin));
    },
};

function generateUserId() {
    // ID with 120 bits of entropy, or about the same as UUID v4.
    const bytes = crypto.getRandomValues(new Uint8Array(15));
    return encodeBase32LowerCase(bytes);
}
