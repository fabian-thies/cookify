import {json} from '@sveltejs/kit';
import {generateAuthenticationOptions} from '@simplewebauthn/server';
import {setChallengeCookie} from '$lib/server/webauthn';

export const POST = async (event) => {
    const options = await generateAuthenticationOptions({
        rpID: event.url.hostname,
        userVerification: 'required'
    });

    setChallengeCookie(event, options.challenge);

    return json(options);
};
