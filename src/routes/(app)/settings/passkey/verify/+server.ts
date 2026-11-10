import {error, json} from '@sveltejs/kit';
import {isoBase64URL} from '@simplewebauthn/server/helpers';
import {verifyRegistrationResponse} from '@simplewebauthn/server';
import {createPasskey} from '$lib/server/db/passkey';
import {takeChallengeCookie} from '$lib/server/webauthn';

export const POST = async (event) => {
    const user = event.locals.user;
    if (!user) {
        throw error(401, 'Unauthorized');
    }

    const challenge = takeChallengeCookie(event);
    if (!challenge) {
        throw error(400, 'Challenge expired');
    }

    const response = await event.request.json().catch(() => null);
    if (!response?.id) {
        throw error(400, 'Invalid response');
    }

    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: challenge,
            expectedOrigin: event.url.origin,
            expectedRPID: event.url.hostname
        });
    } catch (e) {
        console.error('Passkey registration failed:', e);
        throw error(400, 'Verification failed');
    }

    if (!verification.verified) {
        throw error(400, 'Verification failed');
    }

    const {credential} = verification.registrationInfo;

    await createPasskey({
        id: credential.id,
        userId: user.id,
        publicKey: isoBase64URL.fromBuffer(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports?.join(',') ?? null
    });

    return json({success: true});
};
