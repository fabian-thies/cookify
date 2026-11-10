import type {RequestEvent} from '@sveltejs/kit';
import type {AuthenticatorTransportFuture} from '@simplewebauthn/server';

const CHALLENGE_COOKIE = 'passkey-challenge';

export function setChallengeCookie(event: RequestEvent, challenge: string) {
    event.cookies.set(CHALLENGE_COOKIE, challenge, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: event.url.protocol === 'https:',
        maxAge: 300
    });
}

export function takeChallengeCookie(event: RequestEvent) {
    const challenge = event.cookies.get(CHALLENGE_COOKIE);
    event.cookies.delete(CHALLENGE_COOKIE, {path: '/'});
    return challenge;
}

export function parseTransports(transports: string | null): AuthenticatorTransportFuture[] | undefined {
    return transports ? transports.split(',') as AuthenticatorTransportFuture[] : undefined;
}
