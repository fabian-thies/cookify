import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {beforeEach, describe, test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {drizzle} from 'drizzle-orm/pg-proxy';
import * as v from 'valibot';

const require = createRequire(import.meta.url);

function load(path, imports = {}) {
    const source = ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
    }).outputText;
    const exports = {};
    vm.runInNewContext(source, {
        exports,
        require: name => name in imports ? imports[name] : require(name)
    }, {filename: path});
    return exports;
}

const constants = load('src/lib/constants.ts');
const shoppingList = load('src/lib/shopping-list.ts');
const schema = load('src/lib/server/db/schema.ts', {
    '../../constants': constants,
    '../../shopping-list': shoppingList
});

let currentEvent = {locals: {user: null}, params: {}};
let state;
let queries = [];

function resetState() {
    queries = [];
    currentEvent = {locals: {user: null}, params: {}};
    state = {
        nextCollectionId: 100,
        nextLinkId: 1000,
        collections: new Map([
            [1, {id: 1, userId: 'alice', title: 'Alice Favorites'}],
            [2, {id: 2, userId: 'bob', title: 'Bob Favorites'}],
        ]),
        recipes: new Map([
            [10, {id: 10, userId: 'alice', visibility: 'public', title: 'Public Pasta', image: '/img/10.jpg'}],
            [11, {id: 11, userId: 'alice', visibility: 'private', title: 'Alice Secret', image: '/img/11.jpg'}],
            [20, {id: 20, userId: 'bob', visibility: 'private', title: 'Bob Secret', image: '/img/20.jpg'}],
            [21, {id: 21, userId: 'bob', visibility: 'public', title: 'Bob Soup', image: '/img/21.jpg'}],
        ]),
        links: new Map(),
    };
}

resetState();

function buildFullRecipeRow(recipe) {
    const now = new Date('2026-01-01T00:00:00.000Z').toISOString();
    const rowByKey = {
        id: recipe.id,
        title: recipe.title,
        description: 'Desc',
        sourceUrl: null,
        image: recipe.image,
        createdAt: now,
        updatedAt: now,
        cookingTime: 15,
        servings: 2,
        userId: recipe.userId,
        viewCount: 0,
        visibility: recipe.visibility,
        shareToken: null,
        shareEnabled: false,
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        fiber: null,
    };
    return [
        ...Object.keys(recipeDb.recipeColumns).map(key => rowByKey[key]),
        'easy',
        [],
    ];
}

const db = drizzle(async (sql, params) => {
    queries.push({sql, params});

    if (sql.startsWith('select "user_id" from "collections" where "collections"."id" = $1')) {
        const col = state.collections.get(params[0]);
        return {rows: col ? [[col.userId]] : []};
    }

    if (sql.startsWith('select "user_id", "visibility" from "recipes" where "recipes"."id" = $1')) {
        const recipe = state.recipes.get(params[0]);
        return {rows: recipe ? [[recipe.userId, recipe.visibility]] : []};
    }

    if (sql.includes('from "recipes" inner join "difficulty_to_recipe"') && sql.endsWith('where "recipes"."id" = $1')) {
        const recipe = state.recipes.get(params[0]);
        return {rows: recipe ? [buildFullRecipeRow(recipe)] : []};
    }

    if (sql.startsWith('select "id" from "collection_to_recipe"')) {
        const [recipeId, collectionId] = params;
        for (const link of state.links.values()) {
            if (link.recipeId === recipeId && link.collectionId === collectionId) {
                return {rows: [[link.id]]};
            }
        }
        return {rows: []};
    }

    if (sql.startsWith('delete from "collection_to_recipe" where "collection_to_recipe"."id" = $1')) {
        state.links.delete(params[0]);
        return {rows: []};
    }

    if (sql.startsWith('insert into "collection_to_recipe"')) {
        const id = state.nextLinkId++;
        const [recipeId, collectionId] = params;
        state.links.set(id, {id, recipeId, collectionId});
        return {rows: sql.includes('returning') ? [[id]] : []};
    }

    if (sql.startsWith('insert into "collections"')) {
        const id = state.nextCollectionId++;
        const [userId, title] = params;
        state.collections.set(id, {id, userId, title});
        return {rows: [[id, title]]};
    }

    if (sql.includes('from "collections" where "collections"."user_id" =')) {
        return {rows: []};
    }

    return {rows: []};
});

const recipeDb = load('src/lib/server/db/recipe.ts', {
    '$lib/server/db/index': {getDb: () => db},
    '$lib/server/db/schema': schema,
    '$lib/server/utils': {getDifficultyId: () => 1},
    '$lib/server/image': {deleteImage: async () => {}},
    '$app/server': {getRequestEvent: () => currentEvent}
});

const recipeSource = load('src/lib/recipe-source.ts');

const remote = load('src/lib/functions/recipe.remote.ts', {
    'valibot': v,
    '@sveltejs/kit': {
        error: (status, message) => {
            const err = new Error(message);
            err.status = status;
            throw err;
        }
    },
    '$lib/server/db': {getDb: () => db},
    '$lib/server/db/schema': schema,
    '$lib/recipe-source': recipeSource,
    '$lib/server/db/recipe': recipeDb,
    '$app/server': {
        getRequestEvent: () => currentEvent,
        query: (schemaOrFn, maybeFn) => {
            if (typeof schemaOrFn === 'function') {
                return async () => schemaOrFn();
            }
            return async input => maybeFn(v.parse(schemaOrFn, input));
        },
        command: (schemaOrFn, maybeFn) => {
            if (typeof schemaOrFn === 'function') {
                return async () => schemaOrFn();
            }
            return async input => maybeFn(v.parse(schemaOrFn, input));
        }
    }
});

describe('collection auth, ownership, and recipe visibility', () => {
    beforeEach(() => {
        resetState();
    });

    test('unauthenticated toggleRecipeInCollection fails with User not authenticated', async () => {
        currentEvent = {locals: {user: null}, params: {recipeId: '10'}};

        await assert.rejects(
            () => remote.toggleRecipeInCollection({collectionId: 1}),
            {message: 'User not authenticated'}
        );
        assert.equal(queries.length, 0, 'Unauthenticated request must not touch the database');
        assert.equal(state.links.size, 0);
    });

    test('non-owner cannot toggle recipes in another user collection (remote and DB)', async () => {
        currentEvent = {locals: {user: {id: 'alice', administrator: false}}, params: {recipeId: '10'}};

        await assert.rejects(
            () => remote.toggleRecipeInCollection({collectionId: 2}),
            {message: 'Insufficient permissions'}
        );
        assert.equal(state.links.size, 0);

        await assert.rejects(
            () => recipeDb.toggleRecipeInCollection('alice', 10, 2),
            {message: 'Insufficient permissions'}
        );
        assert.equal(state.links.size, 0);

        await assert.rejects(
            () => recipeDb.toggleRecipeInCollection('alice', 10, 999),
            {message: 'Collection not found.'}
        );
    });

    test('user cannot add another user private recipe via toggleRecipeInCollection, createCollection, or getCollectionsForRecipe', async () => {
        currentEvent = {locals: {user: {id: 'alice', administrator: false}}, params: {recipeId: '20'}};

        await assert.rejects(
            () => remote.toggleRecipeInCollection({collectionId: 1}),
            {message: 'Recipe is private'}
        );
        assert.equal(state.links.size, 0);

        await assert.rejects(
            () => recipeDb.toggleRecipeInCollection('alice', 20, 1),
            {message: 'Recipe is private'}
        );
        assert.equal(state.links.size, 0);

        const collectionsBefore = state.collections.size;
        await assert.rejects(
            () => remote.createCollection({title: 'Stolen'}),
            {message: 'Recipe is private'}
        );
        assert.equal(state.collections.size, collectionsBefore, 'Rejected remote createCollection must not insert a collection');
        assert.equal(state.links.size, 0);

        await assert.rejects(
            () => recipeDb.createCollection('alice', 'Stolen', 20),
            {message: 'Recipe is private'}
        );
        assert.equal(state.collections.size, collectionsBefore, 'Rejected DB createCollection must not insert a collection');
        assert.equal(state.links.size, 0);

        await assert.rejects(
            () => remote.getCollectionsForRecipe(),
            {message: 'Recipe is private'}
        );
    });

    test('invalid params.recipeId values are rejected', async () => {
        const invalidIds = [undefined, '', '0', '-1', '1.5', 'abc', '10abc', '2147483648', '999999999999'];

        for (const recipeId of invalidIds) {
            currentEvent = {locals: {user: {id: 'alice', administrator: false}}, params: {recipeId}};

            await assert.rejects(
                () => remote.toggleRecipeInCollection({collectionId: 1}),
                {message: 'Recipe ID not provided'},
                `toggleRecipeInCollection should reject recipeId=${String(recipeId)}`
            );

            await assert.rejects(
                () => remote.getCollectionsForRecipe(),
                {message: 'Recipe ID not provided'},
                `getCollectionsForRecipe should reject recipeId=${String(recipeId)}`
            );
        }

        currentEvent = {locals: {user: {id: 'alice', administrator: false}}, params: {recipeId: '10'}};
        for (const badCollectionId of [0, -1, 1.5, 2_147_483_648]) {
            await assert.rejects(
                () => remote.toggleRecipeInCollection({collectionId: badCollectionId}),
                v.ValiError,
                `toggleRecipeInCollection should reject non-positive-int32 collectionId=${badCollectionId}`
            );
        }
    });

    test('owner can toggle public and own private recipes in their own collection', async () => {
        // Public recipe owned by another user
        currentEvent = {locals: {user: {id: 'alice', administrator: false}}, params: {recipeId: '21'}};
        const addedPublic = await remote.toggleRecipeInCollection({collectionId: 1});
        assert.equal(addedPublic.isInCollection, true);
        assert.equal(state.links.size, 1);

        const removedPublic = await remote.toggleRecipeInCollection({collectionId: 1});
        assert.equal(removedPublic.isInCollection, false);
        assert.equal(state.links.size, 0);

        // Own private recipe
        currentEvent = {locals: {user: {id: 'alice', administrator: false}}, params: {recipeId: '11'}};
        const addedPrivate = await remote.toggleRecipeInCollection({collectionId: 1});
        assert.equal(addedPrivate.isInCollection, true);
        assert.equal(state.links.size, 1);

        const removedPrivate = await remote.toggleRecipeInCollection({collectionId: 1});
        assert.equal(removedPrivate.isInCollection, false);
        assert.equal(state.links.size, 0);

        // Owner can also create a collection with own private recipe or with no recipe
        const createdWithOwnPrivate = await remote.createCollection({title: 'Private Picks'});
        assert.equal(createdWithOwnPrivate.title, 'Private Picks');
        assert.equal(state.links.size, 1);

        currentEvent = {locals: {user: {id: 'alice', administrator: false}}, params: {}};
        const createdEmpty = await remote.createCollection({title: 'Empty Picks'});
        assert.equal(createdEmpty.title, 'Empty Picks');
        assert.equal(state.links.size, 1);
    });

    test('getCollections SQL filters recipeCount, thumbnails, and isInCollection by recipe visibility', async () => {
        await recipeDb.getCollections('alice', 21, 3);
        const query = queries.at(-1);

        assert.ok(query, 'Expected getCollections to execute a query');

        // Outer LEFT JOIN for recipeCount: joins recipes with visibility filter and counts recipes.id
        assert.match(query.sql, /COALESCE\(COUNT\("recipes"\."id"\)::int, 0\)/);
        assert.match(
            query.sql,
            /left join "recipes" on \("recipes"\."id" = "collection_to_recipe"\."recipe_id" and \("recipes"\."visibility" = \$\d+ or "recipes"\."user_id" = \$\d+\)\)/
        );

        // isInCollection and thumbnails subqueries both join recipes and filter by visibility
        const subqueryJoins = query.sql.match(/JOIN "recipes" ON "recipes"\."id" = "collection_to_recipe"\."recipe_id"/g) ?? [];
        assert.equal(
            subqueryJoins.length,
            2,
            `Expected recipes JOIN in isInCollection and thumbnails; got SQL:\n${query.sql}`
        );

        const subqueryVisibilityFilters = query.sql.match(/\("recipes"\."visibility" = 'public' OR "recipes"\."user_id" = \$\d+\)/g) ?? [];
        assert.equal(
            subqueryVisibilityFilters.length,
            2,
            `Expected visibility filter in isInCollection and thumbnails; got SQL:\n${query.sql}`
        );

        // Ensure columns in subqueries are table-qualified (no ambiguous "id")
        assert.match(query.sql, /WHERE "collection_to_recipe"\."collection_id" = "collections"\."id"/);
        assert.deepEqual(query.params, [21, 'alice', 'alice', 3, 'public', 'alice', 'alice']);

        // Verify without recipeId: recipeCount and thumbnails still join recipes and filter visibility
        await recipeDb.getCollections('alice', undefined, 4);
        const listQuery = queries.at(-1);
        assert.match(listQuery.sql, /COALESCE\(COUNT\("recipes"\."id"\)::int, 0\)/);
        assert.match(
            listQuery.sql,
            /left join "recipes" on \("recipes"\."id" = "collection_to_recipe"\."recipe_id" and \("recipes"\."visibility" = \$\d+ or "recipes"\."user_id" = \$\d+\)\)/
        );
        const listSubqueryVisibility = listQuery.sql.match(/\("recipes"\."visibility" = 'public' OR "recipes"\."user_id" = \$\d+\)/g) ?? [];
        assert.equal(listSubqueryVisibility.length, 1);
        assert.deepEqual(listQuery.params, ['alice', 4, 'public', 'alice', 'alice']);
    });
});
