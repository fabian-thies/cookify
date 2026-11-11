import {mkdir, writeFile, rm, rmdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {expect, test} from '@playwright/test';

test.skip(!process.env.PLAYWRIGHT_LAYOUT_TESTS, 'Requires a running Vite server');
const route = `/__tag-search-${process.pid}`;
const directory = resolve('src/routes', route.slice(1));
test.beforeAll(async ({baseURL}) => {
    await mkdir(directory);
    await writeFile(resolve(directory, '+page.svelte'), `<script lang="ts">
import Fixture from '../../../e2e/layout-fixture.svelte';
import RecipeList from '$lib/components/recipe/widgets/RecipeList.svelte';
import {page} from '$app/state';
import {onMount} from 'svelte';
let ready = $state(false); onMount(() => {ready = true;});
const recipes = [{id: 1, title: 'Pasta', tags: ['Vegetarisch'], userId: 'test'}, {id: 2, title: 'Suppe', tags: ['Schnelle Küche'], userId: 'test'}] as any;
</script><div data-ready={ready}><Fixture/><section aria-label="Search fixture"><RecipeList {recipes} userId="test" initialTag={page.url.searchParams.get('tag') ?? ''}/></section></div>`);
    await expect.poll(async () => (await fetch(new URL(route, baseURL))).status, {timeout: 15000}).toBe(200);
});
test.afterAll(async () => { await rm(resolve(directory, '+page.svelte')); await rmdir(directory); });

test('recipe tags link to a selected, removable search filter', async ({page, baseURL}) => {
    await page.context().addCookies([{name: 'PARAGLIDE_LOCALE', value: 'de', url: baseURL!}]);
    await page.goto(route);
    await page.locator('[data-ready="true"]').first().waitFor();
    const tag = page.getByRole('link', {name: 'Schnelle Küche', exact: true});
    await expect(tag).toHaveAttribute('href', '/recipe/search?tag=Schnelle%20K%C3%BCche');
    await tag.focus();
    await expect(tag).toBeFocused();
    const href = await tag.getAttribute('href');
    // Exercise the same query against the real list component without requiring an account.
    await page.goto(route + '?' + href!.split('?')[1]);
    await page.locator('[data-ready="true"]').first().waitFor();
    const search = page.getByRole('region', {name: 'Search fixture'});
    await expect(search.getByRole('link', {name: /Suppe/})).toBeVisible();
    await expect(search.getByRole('link', {name: /Pasta/})).toHaveCount(0);
    await search.locator('[data-slot=badge] button').click();
    await expect(search.getByRole('link', {name: /Pasta/})).toBeVisible();
});
