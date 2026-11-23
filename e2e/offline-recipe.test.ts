import {expect, test} from '@playwright/test';

const recipeId = process.env.PLAYWRIGHT_TEST_RECIPE_ID;
test.use({storageState: process.env.PLAYWRIGHT_STORAGE_STATE});
test.skip(!recipeId || !process.env.PLAYWRIGHT_STORAGE_STATE, 'Requires an authenticated test recipe');

test('a saved recipe and cook mode work after an offline reload', async ({page, context}) => {
    await page.goto(`/recipe/${recipeId}`);
    const title = await page.locator('main h1').innerText();
    await page.getByRole('button', {name: 'Save offline', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Remove offline copy'})).toBeVisible();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

    await context.setOffline(true);
    try {
        await page.goto(`/recipe/${recipeId}/cook`);
        await expect(page.getByRole('heading', {name: title, exact: true})).toBeVisible();
        await page.getByRole('button', {name: '1 min', exact: true}).click();
        await expect(page.getByText('01:00', {exact: true})).toBeVisible();
        await page.getByRole('button', {name: 'Exit', exact: true}).click();
        await expect(page.getByRole('heading', {name: title, exact: true})).toBeVisible();

        await page.getByRole('link', {name: 'Recipes saved offline'}).click();
        await page.getByRole('button', {name: 'Remove offline copy'}).click();
        await expect(page.getByRole('link', {name: title, exact: true})).toHaveCount(0);
    } finally {
        await context.setOffline(false);
    }
});
