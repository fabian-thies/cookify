import {json} from '@sveltejs/kit';
import {generateAuthenticationOptions} from '@simplewebauthn/server';
import {createChallenge} from '$lib/server/webauthn';

export const POST = async (event) => {
    const options = await generateAuthenticationOptions({
        rpID: event.url.hostname,
        userVerification: 'required'
    });

    await createChallenge(event, options.challenge, 'authentication');

    return json(options);
};
