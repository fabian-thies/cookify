import {error, json} from '@sveltejs/kit';
import {generateRegistrationOptions} from '@simplewebauthn/server';
import {getPasskeysByUserId} from '$lib/server/db/passkey';
import {setChallengeCookie} from '$lib/server/webauthn';

export const POST = async (event) => {
    const user = event.locals.user;
    if (!user) {
        throw error(401, 'Unauthorized');
    }

    const existing = await getPasskeysByUserId(user.id);

    const options = await generateRegistrationOptions({
        rpName: 'Cookify',
        rpID: event.url.hostname,
        userName: user.username,
        userDisplayName: user.username,
        userID: new TextEncoder().encode(user.id),
        excludeCredentials: existing.map(({id}) => ({id})),
        authenticatorSelection: {
            residentKey: 'required',
            userVerification: 'required'
        }
    });

    setChallengeCookie(event, options.challenge);

    return json(options);
};
