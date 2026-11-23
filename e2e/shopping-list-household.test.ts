import {expect, test, type Page} from '@playwright/test';

const partnerStorage = process.env.PLAYWRIGHT_OTHER_STORAGE_STATE;
const partnerUsername = process.env.PLAYWRIGHT_SHOPPING_PARTNER_USERNAME;
const ownerUsername = process.env.PLAYWRIGHT_SHOPPING_OWNER_USERNAME;

test.use({storageState: process.env.PLAYWRIGHT_STORAGE_STATE});
test.skip(!process.env.PLAYWRIGHT_STORAGE_STATE || !partnerStorage || !partnerUsername || !ownerUsername,
    'Requires two disposable, authenticated shopping list accounts');

async function openShoppingList(page: Page) {
    await page.goto('/meal-plan');
    await page.getByRole('button', {name: 'Shopping List', exact: true}).click();
    const panel = page.getByRole('region', {name: 'Shopping List', exact: true});
    await expect(panel.getByRole('textbox', {name: 'Add an item'})).toBeVisible();
    return panel;
}

test('household shopping items sync and access can be revoked', async ({page, browser, baseURL}) => {
    test.setTimeout(60_000);
    const name = `Dish soap ${Date.now()}`;
    const partnerItem = `Coffee ${Date.now()}`;
    const owner = await openShoppingList(page);
    const partnerContext = await browser.newContext({baseURL, storageState: partnerStorage});

    try {
        const partnerPage = await partnerContext.newPage();
        const partner = await openShoppingList(partnerPage);
        const listPicker = partner.getByRole('button', {name: 'Choose shopping list'});
        await expect(listPicker).toHaveCount(0);

        await owner.getByRole('textbox', {name: 'Add an item'}).fill(name);
        await owner.getByRole('button', {name: 'Add', exact: true}).click();
        const ownerItem = owner.getByRole('checkbox', {name, exact: true});
        await expect(ownerItem).toBeVisible();

        await owner.getByRole('button', {name: 'Share list', exact: true}).click();
        await owner.getByRole('textbox', {name: 'Username', exact: true}).fill(partnerUsername!);
        await owner.getByRole('button', {name: 'Give access', exact: true}).click();
        const revoke = owner.getByRole('button', {name: `Remove access for ${partnerUsername}`});
        await expect(revoke).toBeVisible();

        await expect(listPicker).toBeVisible({timeout: 12_000});
        await listPicker.click();
        await partnerPage.getByRole('option', {name: `List from ${ownerUsername}`}).click({timeout: 5000});
        const sharedItem = partner.getByRole('checkbox', {name, exact: true});
        await expect(sharedItem).toBeVisible();
        const alreadyHave = (element: typeof sharedItem) => element.locator('..').getByRole('button', {name: 'Already have'});
        await alreadyHave(sharedItem).click();
        await expect(alreadyHave(ownerItem)).toHaveAttribute('aria-pressed', 'true', {timeout: 12_000});

        await partner.getByRole('textbox', {name: 'Add an item'}).fill(partnerItem);
        await partner.getByRole('button', {name: 'Add', exact: true}).click();
        await expect(owner.getByRole('checkbox', {name: partnerItem, exact: true})).toBeVisible({timeout: 12_000});

        await revoke.click();
        await expect(listPicker).toHaveCount(0, {timeout: 12_000});
        await expect(sharedItem).toHaveCount(0);
    } finally {
        await partnerContext.close();
        for (const itemName of [name, partnerItem]) {
            const remove = owner.getByRole('button', {name: `Remove ${itemName}`, exact: true});
            if (await remove.isVisible()) {
                await remove.click();
                await expect(remove).toHaveCount(0);
            }
        }
    }
});
