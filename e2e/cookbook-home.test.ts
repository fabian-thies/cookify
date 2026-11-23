import {expect, test} from '@playwright/test';

test.use({storageState: process.env.PLAYWRIGHT_STORAGE_STATE, viewport: {width: 390, height: 844}});
test.skip(!process.env.PLAYWRIGHT_STORAGE_STATE || !process.env.PLAYWRIGHT_TEST_RECIPE_ID,
    'Requires an authenticated user with an owned recipe');

test('personal cookbook keeps recent recipes available when favorites fail', async ({page}) => {
    const favoritesQuery = '**/_app/remote/**/getFavoriteRecipes*';
    await page.route(favoritesQuery, route => route.abort());
    await page.goto('/');

    const main = page.locator('main');
    await expect(main.getByRole('heading', {name: 'My cookbook'})).toBeVisible();
    await expect(main.getByRole('link', {name: 'Search recipes'})).toHaveAttribute('href', '/recipe/search');
    await expect(main.getByRole('link', {name: 'Create Recipe'})).toHaveAttribute('href', '/recipe/create');
    await expect(page.getByRole('link', {name: 'Cookbook', exact: true})).toHaveAttribute('aria-current', 'page');
    const recent = main.getByRole('region', {name: 'Recently added'});
    await expect(recent.getByRole('heading', {level: 3}).first()).toBeVisible();

    const favorites = main.getByRole('region', {name: 'Favorites', exact: true});
    const retry = favorites.getByRole('button', {name: 'Try again'});
    await expect(retry).toBeVisible();
    await page.unroute(favoritesQuery);
    await retry.click();
    await expect(retry).toBeHidden();
});
