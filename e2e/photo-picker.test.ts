import {mkdir, writeFile, rm, rmdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {expect, test} from '@playwright/test';

test.skip(!process.env.PLAYWRIGHT_LAYOUT_TESTS, 'Requires a running Vite dev server');
const route = `/__photo-picker-${process.pid}`;
const directory = resolve('src/routes', route.slice(1));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
test.beforeAll(async ({baseURL}) => {
    await mkdir(directory);
    await writeFile(resolve(directory, '+page.svelte'), `<script>import PhotoPicker from '$lib/components/recipe/form/PhotoPicker.svelte'; import {page} from '$app/state'; import {onMount} from 'svelte'; let ready = $state(false); onMount(() => {ready = true;}); const original = 'data:image/png;base64,' + 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';</script><main data-ready={ready} class="mx-auto max-w-sm p-5"><form><PhotoPicker required={!page.url.searchParams.has("edit")} image={page.url.searchParams.has("edit") ? original : undefined}/><button type="submit">Save</button></form></main>`);
    await expect.poll(async () => (await fetch(new URL(route, baseURL))).status, {timeout: 15000}).toBe(200);
});
test.afterAll(async () => {
    await rm(resolve(directory, '+page.svelte'));
    await rmdir(directory);
});

for (const width of [390, 1280]) {
    test(`photo selection, validation and reset at ${width}px`, async ({page, baseURL}) => {
        await page.setViewportSize({width, height: 844});
        await page.context().addCookies([{name: 'PARAGLIDE_LOCALE', value: 'de', url: baseURL!}]);
        await page.goto(route);
        await page.locator('main[data-ready="true"]').waitFor();
        const input = page.locator('input[type=file]');
        await expect(input).toHaveAccessibleName('Foto auswählen');
        await expect.poll(() => input.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
        await input.focus();
        const chooser = page.waitForEvent('filechooser');
        await page.keyboard.press('Enter');
        await (await chooser).setFiles({name: 'Rezeptfoto.png', mimeType: 'image/png', buffer: png});
        await expect(page.getByRole('img')).toBeVisible();
        await expect(input).toHaveAccessibleName('Foto ändern');
        expect(await input.evaluate((el: HTMLInputElement) => new FormData(el.form!).get('picture') instanceof File)).toBe(true);
        await page.getByRole('button', {name: 'Auswahl zurücksetzen'}).click();
        await expect(input).toBeFocused();
        await expect(page.getByRole('img')).toHaveCount(0);
        await input.setInputFiles({name: 'Zu-groß.png', mimeType: 'image/png', buffer: Buffer.alloc(15 * 1024 * 1024 + 1)});
        await expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(await input.evaluate((el: HTMLInputElement) => el.validity.customError)).toBe(true);
        await input.setInputFiles({name: 'Rezeptfoto.png', mimeType: 'image/png', buffer: png});
        await expect(input).toHaveAttribute('aria-invalid', 'false');
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({path: `artifacts/ui-audit/photo-picker-${width}.png`});
    });
}

test('resetting a replacement keeps the existing recipe photo', async ({page}) => {
    await page.goto(route + '?edit');
    await page.locator('main[data-ready="true"]').waitFor();
    const input = page.locator('input[type=file]');
    const original = await page.getByRole('img').getAttribute('src');
    await input.setInputFiles({name: 'Replacement.png', mimeType: 'image/png', buffer: png});
    await expect(page.getByRole('img')).toHaveAttribute('src', /^blob:/);
    await page.getByRole('button', {name: /Auswahl zurücksetzen|Reset selection/}).click();
    await expect(page.getByRole('img')).toHaveAttribute('src', original!);
    expect(await input.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(true);
});
