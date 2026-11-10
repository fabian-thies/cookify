import {expect, test} from '@playwright/test';

// Uses a Chromium virtual authenticator, so the real WebAuthn flow is exercised end to end.
test('register, add passkey and log in with it', async ({page, browserName, context}) => {
    test.skip(browserName !== 'chromium', 'Virtual authenticator is Chromium only');

    const cdp = await context.newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator', {
        options: {
            protocol: 'ctap2',
            transport: 'internal',
            hasResidentKey: true,
            hasUserVerification: true,
            isUserVerified: true,
            automaticPresenceSimulation: true
        }
    });

    const username = `pwtest${Date.now()}`;
    const password = 'supersecret123';

    await page.goto('/login');
    await page.getByRole('button', {name: 'Sign up'}).click();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').fill(`${username}@example.com`);
    await page.getByLabel('Password', {exact: true}).fill(password);
    await page.getByLabel('Confirm Password').fill(password);
    await page.getByRole('button', {name: 'Create Account'}).click();
    await expect(page).toHaveURL('/');

    await page.goto('/settings');
    await page.getByRole('button', {name: /add passkey/i}).click();
    await expect(page.getByRole('button', {name: /remove passkey/i})).toBeVisible();

    // Drop the session cookie, then sign in with the passkey instead of the password.
    await context.clearCookies();
    await page.goto('/login');
    await page.getByRole('button', {name: /sign in with passkey/i}).click();
    await expect(page).toHaveURL('/');

    // The remove button is destructive too, so cover it: one passkey in, none left.
    await page.goto('/settings');
    await page.getByRole('button', {name: /remove passkey/i}).click();
    await expect(page.getByText('No passkey added yet.')).toBeVisible();
});
