import {expect, test} from '@playwright/test';

// Run against the updated backend with two different test users. The first owns a private recipe.
test.use({storageState: process.env.PLAYWRIGHT_STORAGE_STATE});
test.skip(!process.env.PLAYWRIGHT_TEST_RECIPE_ID || !process.env.PLAYWRIGHT_OTHER_STORAGE_STATE,
    'Requires a private recipe and two authenticated test users');

test('private recipes remain discoverable to their owner and favorites stay personal', async ({page, browser}) => {
    await page.goto(`/recipe/${process.env.PLAYWRIGHT_TEST_RECIPE_ID}`);
    const title = await page.locator('main h1').innerText();
    const favorite = page.getByRole('button', {name: 'Favorites', exact: true});
    if (await favorite.getAttribute('aria-pressed') !== 'true') await favorite.click();
    await expect(favorite).toBeEnabled();

    for (const path of ['/recipe/search', '/favorites']) {
        await page.goto(path);
        await expect(page.getByRole('heading', {name: title, exact: true})).toBeVisible();
    }

    const other = await browser.newContext({storageState: process.env.PLAYWRIGHT_OTHER_STORAGE_STATE});
    try {
        const otherPage = await other.newPage();
        for (const path of ['/recipe/search', '/favorites']) {
            await otherPage.goto(new URL(path, page.url()).href);
            await expect(otherPage.getByRole('status')).toContainText('recipes found');
            await expect(otherPage.getByRole('heading', {name: title, exact: true})).toHaveCount(0);
        }
    } finally {
        await other.close();
    }
});
