import {hash, verify} from '@node-rs/argon2';
import {encodeBase32LowerCase} from '@oslojs/encoding';
import {type Actions, fail, redirect} from '@sveltejs/kit';
import {eq} from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import {db} from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {PageServerLoad} from './$types';

export const load: PageServerLoad = async (event) => {
    if (event.locals.user) {
        return redirect(302, '/');
    }
    return {};
};

export const actions: Actions = {
    login: async (event) => {
        const formData = await event.request.formData();
        const username = formData.get('username');
        const password = formData.get('password');

        if (!validateUsername(username)) {
            return fail(400, {message: 'Invalid username (min 3, max 31 characters, alphanumeric only)'});
        }
        
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return fail(400, {message: 'Invalid password (min 6, max 255 characters)'});
        }

        const validatedPassword = password as string;

        const results = await db
            .select()
            .from(table.user)
            .where(eq(table.user.username, username));

        const existingUser = results.at(0);
        if (!existingUser) {
            return fail(400, {message: 'Incorrect username or password'});
        }

        const validPassword = await verify(existingUser.passwordHash, validatedPassword, {
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

        return redirect(302, '/');
    },
    register: async (event) => {
        const formData = await event.request.formData();
        const username = formData.get('username');
        const password = formData.get('password');

        if (!validateUsername(username)) {
            return fail(400, {message: 'Invalid username'});
        }
        
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return fail(400, {message: 'Invalid password (min 6, max 255 characters)'});
        }
        if (passwordValidation.isTooWeak) {
            return fail(400, {message: 'Password is too weak. Use a mix of uppercase, lowercase, numbers, and special characters.'});
        }

        const validatedPassword = password as string;

        const userId = generateUserId();
        const passwordHash = await hash(validatedPassword, {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1,
        });

        try {
            await db.insert(table.user).values({id: userId, username, passwordHash});

            const sessionToken = auth.generateSessionToken();
            const session = await auth.createSession(sessionToken, userId);
            auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
        } catch (e) {
            return fail(500, {message: 'An error has occurred'});
        }
        return redirect(302, '/');
    },
};

function generateUserId() {
    // ID with 120 bits of entropy, or about the same as UUID v4.
    const bytes = crypto.getRandomValues(new Uint8Array(15));
    return encodeBase32LowerCase(bytes);
}

function validateUsername(username: unknown): username is string {
    return (
        typeof username === 'string' &&
        username.length >= 3 &&
        username.length <= 31 &&
        /^[a-z0-9_-]+$/.test(username)
    );
}

function validatePassword(password: unknown): { isValid: boolean; isTooWeak: boolean } {
    const isString = typeof password === 'string';
    const hasValidLength = isString && password.length >= 6 && password.length <= 255;
    
    if (!isString || !hasValidLength) {
        return { isValid: false, isTooWeak: false };
    }
    
    const hasUppercase = /[A-Z]/.test(password as string);
    const hasLowercase = /[a-z]/.test(password as string);
    const hasNumbers = /[0-9]/.test(password as string);
    const hasSpecialChars = /[^A-Za-z0-9]/.test(password as string);
    
    const strengthScore = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length;
    const isStrong = strengthScore >= 3;
    
    return { 
        isValid: true, 
        isTooWeak: !isStrong 
    };
}