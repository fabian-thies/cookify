import {startAuthentication, startRegistration} from '@simplewebauthn/browser';

// One WebAuthn ceremony: fetch options, let the authenticator sign, post the result back.
async function post(url: string, body?: unknown) {
    const response = await fetch(url, body === undefined ? {method: 'POST'} : {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        throw new Error(`${url} failed`);
    }
    return response.json();
}

export async function loginWithPasskey() {
    const optionsJSON = await post('/login/passkey/options');
    await post('/login/passkey/verify', await startAuthentication({optionsJSON}));
}

export async function addPasskey() {
    const optionsJSON = await post('/settings/passkey/options');
    await post('/settings/passkey/verify', await startRegistration({optionsJSON}));
}
