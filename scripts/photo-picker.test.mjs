import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {compile, compileModule} from 'svelte/compiler';
import {chromium, expect} from '@playwright/test';
import sharp from 'sharp';

// Mount the real component and its UI primitives without an app server or database.
const bundle = await build({
    stdin: {contents: `import {mount} from 'svelte'; import Picker from './src/lib/components/recipe/form/PhotoPicker.svelte'; mount(Picker, {target: document.querySelector('form'), props: {required: true}});`, resolveDir: process.cwd()},
    bundle: true, write: false, format: 'iife', platform: 'browser', conditions: ['browser', 'svelte'],
    define: {'import.meta.env.SSR': 'false'},
    alias: {'$lib': path.resolve('src/lib')},
    plugins: [{name: 'svelte-fixture', setup(builder) {
        builder.onLoad({filter: /\.svelte$/}, args => ({contents: compile(readFileSync(args.path, 'utf8'), {filename: args.path, generate: 'client'}).js.code}));
        builder.onLoad({filter: /\.svelte\.js$/}, args => ({contents: compileModule(readFileSync(args.path, 'utf8'), {filename: args.path, generate: 'client'}).js.code}));
    }}]
});
const browser = await chromium.launch({headless: true});
try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const image = await sharp({create: {width: 50, height: 30, channels: 3, background: '#ed9933'}}).webp().toBuffer();
    let attempts = 0;
    await page.route('https://cookify.test/**', async route => {
        if (route.request().url().endsWith('/api/recipes/image')) {
            attempts++;
            const {url} = route.request().postDataJSON();
            if (url.includes('bad')) return route.fulfill({status: 400, json: {error: 'Invalid image'}});
            return route.fulfill({status: 200, contentType: 'image/webp', body: image});
        }
        return route.fulfill({contentType: 'text/html', body: '<form></form>'});
    });
    await page.goto('https://cookify.test/');
    await page.addScriptTag({content: bundle.outputFiles[0].text});
    const upload = page.getByRole('tab').nth(0);
    const link = page.getByRole('tab').nth(1);
    await expect(upload).toHaveAttribute('aria-selected', 'true');
    await page.locator('#picture').setInputFiles({name: 'upload.webp', mimeType: 'image/webp', buffer: image});
    await expect(page.getByRole('img')).toBeVisible();
    await link.click();
    await expect(page.locator('#picture')).toBeDisabled();
    await page.locator('#pictureUrl').fill('https://example.com/photo');
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
    await expect.poll(() => page.locator('input[hidden][type="file"]').evaluate(el => el.files.length)).toBe(1);
    await expect(page.getByRole('img')).toBeVisible();
    assert.equal(await page.locator('form').evaluate(form => form.checkValidity()), true);
    assert.deepEqual(await page.locator('form').evaluate(form => new FormData(form).getAll('picture').map(file => file.name)), ['recipe-image.webp']);
    await page.locator('#pictureUrl').fill('https://example.com/bad');
    await expect.poll(() => page.locator('#pictureUrl').getAttribute('aria-invalid')).toBe('true');
    assert.equal(await page.locator('form').evaluate(form => form.checkValidity()), false);
    await upload.click();
    assert.equal(await page.locator('form').evaluate(form => form.checkValidity()), true);
    assert.deepEqual(await page.locator('form').evaluate(form => new FormData(form).getAll('picture').map(file => file.name)), ['upload.webp']);
    // Keyboard navigation uses the existing accessible tabs primitive.
    await upload.focus();
    await page.keyboard.press('ArrowRight');
    await expect(link).toBeFocused();
    assert.ok(attempts >= 2);
    assert.deepEqual(errors, []);
    console.log('Photo picker browser interaction checks passed');
} finally {
    await browser.close();
}
