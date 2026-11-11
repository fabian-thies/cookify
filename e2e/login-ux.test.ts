import {expect, test} from '@playwright/test';

test('a failed login preserves inputs and allows another attempt', async ({page}) => {
    await page.route('**/_app/remote/**/getAllowRegistrations*', route => route.fulfill({
        json: {type: 'result', result: '[true]'}
    }));
    await page.route('**/login?*/login', route => route.fulfill({
        json: {type: 'error', status: 500, error: {message: 'Test failure'}}
    }));
    await page.goto('/login');
    await expect(page.getByRole('button', {name: 'Sign up', exact: true})).toBeVisible();
    await page.getByLabel('Username', {exact: true}).fill('testuser');
    await page.getByLabel('Password', {exact: true}).fill('test-password');
    await page.getByRole('button', {name: 'Sign In', exact: true}).click();
    await expect(page.getByText('An error occurred. Please try again.')).toBeVisible();
    await expect(page.getByLabel('Username', {exact: true})).toHaveValue('testuser');
    await expect(page.getByLabel('Password', {exact: true})).toHaveValue('test-password');
    await expect(page.getByRole('button', {name: 'Sign In', exact: true})).toBeEnabled();
});
