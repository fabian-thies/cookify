import {error, json} from '@sveltejs/kit';
import {isoBase64URL} from '@simplewebauthn/server/helpers';
import {verifyAuthenticationResponse} from '@simplewebauthn/server';
import * as auth from '$lib/server/auth';
import {getPasskeyById, updatePasskeyCounter} from '$lib/server/db/passkey';
import {parseTransports, takeChallengeCookie} from '$lib/server/webauthn';

export const POST = async (event) => {
    const challenge = takeChallengeCookie(event);
    if (!challenge) {
        throw error(400, 'Challenge expired');
    }

    const response = await event.request.json().catch(() => null);
    if (!response?.id) {
        throw error(400, 'Invalid response');
    }

    const passkey = await getPasskeyById(response.id);
    if (!passkey) {
        throw error(400, 'Unknown passkey');
    }

    let verification;
    try {
        verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: challenge,
            expectedOrigin: event.url.origin,
            expectedRPID: event.url.hostname,
            credential: {
                id: passkey.id,
                publicKey: isoBase64URL.toBuffer(passkey.publicKey),
                counter: passkey.counter,
                transports: parseTransports(passkey.transports)
            }
        });
    } catch (e) {
        console.error('Passkey verification failed:', e);
        throw error(400, 'Verification failed');
    }

    if (!verification.verified) {
        throw error(400, 'Verification failed');
    }

    await updatePasskeyCounter(passkey.id, verification.authenticationInfo.newCounter);

    const sessionToken = auth.generateSessionToken();
    const session = await auth.createSession(sessionToken, passkey.userId);
    auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

    return json({success: true});
};
