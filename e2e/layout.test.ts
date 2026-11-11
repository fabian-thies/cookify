import {mkdir, writeFile, rm, rmdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {expect, test} from '@playwright/test';

// Uses the real components through Vite; no database, account, or AI requests needed.
// PLAYWRIGHT_LAYOUT_TESTS=1 PLAYWRIGHT_TEST_BASE_URL=http://localhost:5173 playwright test e2e/layout.test.ts
test.skip(!process.env.PLAYWRIGHT_LAYOUT_TESTS, 'Requires a running Vite dev server');

const fixtureRoute = `/__layout-regression-${process.pid}`;
const fixtureDirectory = resolve('src/routes', fixtureRoute.slice(1));
let fixtureCreated = false;

test.beforeAll(async ({baseURL}) => {
    await mkdir(fixtureDirectory);
    fixtureCreated = true;
    await writeFile(resolve(fixtureDirectory, '+page.svelte'),
        '<script>import Fixture from "../../../e2e/layout-fixture.svelte"; import {page} from "$app/state";</script><Fixture shared={page.url.searchParams.has("shared")} metadata={!page.url.searchParams.has("plain")}/>', {flag: 'wx'});
    await expect.poll(async () => (await fetch(new URL(fixtureRoute, baseURL))).status, {timeout: 15000}).toBe(200);
});

test.afterAll(async () => {
    if (!fixtureCreated) return;
    await rm(resolve(fixtureDirectory, '+page.svelte'));
    await rmdir(fixtureDirectory);
});

for (const locale of ['de', 'en']) {
    for (const width of [320, 390, 430, 768, 1280]) {
        test(`${locale}: dialogs fit ${width}px, including photo input and selected options`, async ({page, baseURL}) => {
            await page.setViewportSize({width, height: 844});
            await page.context().addCookies([{name: 'PARAGLIDE_LOCALE', value: locale, url: baseURL!}]);
            await page.goto(fixtureRoute);
            await page.locator('main[data-ready="true"]').waitFor();
            await page.getByRole('button', {name: /Mit KI erstellen|Create with AI/, exact: true}).click();
            const dialog = page.getByRole('dialog');
            async function expectContained() {
                await expect(dialog).toBeVisible();
                await expect.poll(() => dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBe(0);
                const bounds = await dialog.boundingBox();
                expect(bounds!.x).toBeGreaterThanOrEqual(0);
                expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
            }
            await expectContained();
            await dialog.getByRole('tab', {name: /Foto|Photo/, exact: true}).click();
            await expectContained();
            await dialog.locator('input[type=file]').setInputFiles({
                name: 'Ein langes Foto einer handschriftlichen Rezeptseite.png',
                mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
            });
            await expectContained();
            await dialog.locator('[data-slot=select-trigger]').click();
            const options = page.getByRole('option');
            await expect(options.first()).toBeVisible();
            const optionBounds = await options.first().boundingBox();
            expect(optionBounds!.x).toBeGreaterThanOrEqual(0);
            expect(optionBounds!.x + optionBounds!.width).toBeLessThanOrEqual(width);
            await options.last().click();
            await expectContained();
            await page.keyboard.press('Escape');
            await expect(dialog).not.toBeVisible();
            for (const name of [/Mit KI bearbeiten|Edit with AI/, /^Import(?:ieren)?$/]) {
                await page.getByRole('button', {name, exact: true}).click();
                await expectContained();
                await page.keyboard.press('Escape');
                await expect(dialog).not.toBeVisible();
            }
        });
    }
}

for (const [width, query] of [[320, ""], [390, ""], [768, ""], [1280, ""], [390, "?shared"], [390, "?plain"]] as const) {
    test(`recipe badges are readable and separated from ingredients at ${width}px ${query}`, async ({page, baseURL}) => {
        await page.setViewportSize({width, height: 1000});
        await page.context().addCookies([{name: 'PARAGLIDE_LOCALE', value: 'de', url: baseURL!}]);
        await page.goto(fixtureRoute + query);
        await page.locator('main[data-ready="true"]').waitFor();
        const badges = page.locator('[data-slot=badge]');
        await expect(badges).toHaveCount(query === "?plain" ? 0 : 7);
        const sizes = await badges.evaluateAll(nodes => nodes.map(el => ({
            font: parseFloat(getComputedStyle(el).fontSize), height: el.getBoundingClientRect().height
        })));
        for (const size of sizes) {
            expect(size.font).toBeGreaterThanOrEqual(12);
            expect(size.height).toBeGreaterThanOrEqual(24);
        }
        const gap = await page.getByTestId('recipe-body').evaluate(el =>
            el.getBoundingClientRect().top - el.previousElementSibling!.getBoundingClientRect().bottom
        );
        expect(gap).toBeGreaterThanOrEqual(24);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
}

for (const width of [1024, 1280, 1440]) {
    test(`desktop recipe actions sit beside the title at ${width}px`, async ({page, baseURL}) => {
        await page.setViewportSize({width, height: 1000});
        await page.context().addCookies([{name: 'PARAGLIDE_LOCALE', value: 'de', url: baseURL!}]);
        await page.goto(fixtureRoute);
        await page.locator('main[data-ready="true"]').waitFor();
        const heading = await page.getByRole('heading', {level: 1}).boundingBox();
        const cook = await page.getByRole('link', {name: 'Kochmodus', exact: true}).boundingBox();
        const actions = await page.getByRole('button', {name: 'Mehr', exact: true}).boundingBox();
        const body = await page.getByTestId('recipe-body').boundingBox();
        expect(cook!.x).toBeGreaterThanOrEqual(heading!.x + heading!.width + 24);
        expect(Math.abs(cook!.y - heading!.y)).toBeLessThanOrEqual(4);
        expect(Math.abs(actions!.x + actions!.width - body!.x - body!.width)).toBeLessThanOrEqual(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
}
