import {expect, test} from '@playwright/test';

const recipeId = process.env.PLAYWRIGHT_TEST_RECIPE_ID;
const otherStorage = process.env.PLAYWRIGHT_OTHER_STORAGE_STATE;
test.use({storageState: process.env.PLAYWRIGHT_STORAGE_STATE});
test.skip(!recipeId || !process.env.PLAYWRIGHT_STORAGE_STATE || !otherStorage,
    'Requires an owned private recipe with two ingredients and a second account');

test('ingredient search requires each ingredient and personal notes persist', async ({page, browser, baseURL}) => {
    await page.goto(`/recipe/${recipeId}`);
    const title = await page.locator('main h1').innerText();
    const ingredients = await page.locator('main li').filter({has: page.locator('span')}).evaluateAll(rows =>
        rows.filter(row => row.querySelectorAll(':scope > span').length === 2)
            .map(row => row.querySelector(':scope > span:nth-child(2)')?.textContent?.trim() ?? ''));
    expect(ingredients.length).toBeGreaterThanOrEqual(2);

    const note = page.getByRole('textbox', {name: 'Personal note'});
    await expect(note).toBeEditable();
    const before = await note.inputValue();
    try {
        await note.fill('Cook ten minutes less next time.');
        await page.getByRole('button', {name: 'Save', exact: true}).click();
        await expect(page.getByText('Note saved.')).toBeVisible();
        await page.reload();
        await expect(note).toHaveValue('Cook ten minutes less next time.');
    } finally {
        if (await note.inputValue() !== before) {
            await note.fill(before);
            await page.getByRole('button', {name: 'Save', exact: true}).click();
            await expect(page.getByRole('button', {name: 'Save', exact: true})).toBeDisabled();
        }
    }

    const query = ingredients.slice(0, 2).join(',');
    await page.goto('/recipe/search');
    await page.getByRole('checkbox', {name: 'Ingredients only'}).check();
    const search = page.getByRole('searchbox', {name: 'Search ingredients'});
    await search.fill(query);
    await expect(page.getByRole('heading', {name: title, exact: true})).toBeVisible();
    await search.fill(query + ',missingingredientxyz');
    await expect(page.getByText('0 recipes found', {exact: true})).toBeVisible();

    const other = await browser.newContext({baseURL, storageState: otherStorage});
    try {
        const otherPage = await other.newPage();
        await otherPage.goto('/recipe/search');
        await otherPage.getByRole('checkbox', {name: 'Ingredients only'}).check();
        const otherSearch = otherPage.getByRole('searchbox', {name: 'Search ingredients'});
        const response = otherPage.waitForResponse(res => res.url().includes('/searchRecipes'));
        await otherSearch.fill(query);
        expect((await response).ok()).toBe(true);
        await expect(otherPage.getByRole('heading', {name: title, exact: true})).toHaveCount(0);
    } finally {
        await other.close();
    }
});
