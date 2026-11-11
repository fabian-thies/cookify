import {expect, test} from '@playwright/test';

// Supply an authenticated test account and a recipe it owns on the test instance.
test.use({storageState: process.env.PLAYWRIGHT_STORAGE_STATE, viewport: {width: 390, height: 844}});
test.skip(!process.env.PLAYWRIGHT_TEST_RECIPE_ID, 'Requires an owned test recipe');
const recipeId = process.env.PLAYWRIGHT_TEST_RECIPE_ID;

test('recipe form preserves drafts and accepts fractional ingredient quantities', async ({page}) => {
    await page.goto(`/recipe/${recipeId}/edit`);
    await expect(page.locator('#title')).not.toHaveValue('');
    await page.getByRole('link', {name: 'Cancel', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`/recipe/${recipeId}$`));

    await page.goto(`/recipe/${recipeId}/edit`);
    const amount = page.locator('[name="ingredients_amount[]"]').first();
    await amount.fill('0.5');
    expect(await amount.evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(true);
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('link', {name: 'Cancel', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`/recipe/${recipeId}/edit$`));
    await expect(amount).toHaveValue('0.5');
});

test('mobile import dialog has one trigger and restores focus', async ({page}) => {
    await page.goto('/recipe/create');
    const trigger = page.getByRole('button', {name: 'Import', exact: true});
    await expect(page.locator('[name="ingredients_name[]"]').first()).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Recipe URL')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(page.locator('button button, a button')).toHaveCount(0);
});

test('search failure offers recovery instead of an endless loading state', async ({page}) => {
    await page.route('**/_app/remote/**/getRecipes*', route => route.abort());
    await page.goto('/recipe/search');
    const retry = page.getByRole('button', {name: 'Try again'});
    await expect(retry).toBeVisible();
    await page.unroute('**/_app/remote/**/getRecipes*');
    await retry.click();
    await expect(page.getByRole('status')).toContainText('recipes found');
});


test('URL import updates the visible difficulty and decimal ingredient amount', async ({page}) => {
    await page.route('**/api/recipes/scrape', route => route.fulfill({json: {
        title: 'Imported recipe', description: 'Import test', image: null,
        cookTime: 15, servings: 2, difficulty: 'easy',
        ingredients: [{name: 'Pasta', amount: 0.5, unit: 'kg'}],
        steps: ['Cook pasta for 10 minutes.'], tags: []
    }}));
    await page.goto('/recipe/create');
    await expect(page.locator('[name="ingredients_name[]"]').first()).toBeVisible();
    await page.getByRole('button', {name: 'Import', exact: true}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Recipe URL').fill('https://example.com/recipe');
    await dialog.getByRole('button', {name: 'Import', exact: true}).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('#title')).toHaveValue('Imported recipe');
    await expect(page.locator('[name="ingredients_amount[]"]').first()).toHaveValue('0.5');
    await expect(page.locator('#difficulty')).toHaveText('Easy');
});

test('cook timer accounts for a suspended browser and supports pausing', async ({page}) => {
    await page.clock.install();
    await page.goto(`/recipe/${recipeId}/cook`);
    await page.getByRole('button', {name: '1 min', exact: true}).click();
    await expect(page.getByText('01:00', {exact: true})).toBeVisible();
    await page.clock.fastForward(30_000);
    await expect(page.getByText('00:30', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Pause', exact: true}).click();
    await page.clock.fastForward(60_000);
    await expect(page.getByText('00:30', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Start Timer', exact: true}).first().click();
    await page.clock.fastForward(60_000);
    await expect(page.getByText('00:00', {exact: true})).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
    test(`main screens fit a ${width}px viewport`, async ({page}) => {
        await page.setViewportSize({width, height: 900});
        for (const path of ['/recipe/create', `/recipe/${recipeId}`, '/meal-plan', '/settings']) {
            await page.goto(path);
            await expect(page.locator('main')).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
    });
}
