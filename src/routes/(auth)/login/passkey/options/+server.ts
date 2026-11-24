import {error, json} from '@sveltejs/kit';
import {generateAuthenticationOptions} from '@simplewebauthn/server';
import {createChallenge} from '$lib/server/webauthn';
import {checkPasskeyOptionsRateLimit, getClientIp} from '$lib/server/auth-rate-limit';

export const POST = async (event) => {
    if (!checkPasskeyOptionsRateLimit(getClientIp(event))) {
        throw error(429, 'Too many attempts. Please try again later.');
    }

    const options = await generateAuthenticationOptions({
        rpID: event.url.hostname,
        userVerification: 'required'
    });

    await createChallenge(event, options.challenge, 'authentication');

    return json(options);
};
