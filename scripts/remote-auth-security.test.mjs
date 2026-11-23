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
let queries = [];
let mutations = [];

const recipesById = new Map([
    [10, {
        id: 10,
        userId: 'alice',
        visibility: 'public',
        title: 'Alice Public Pasta',
        shareToken: 'alice-secret-share-token',
        shareEnabled: true,
        tags: ['pasta'],
    }],
    [20, {
        id: 20,
        userId: 'bob',
        visibility: 'private',
        title: 'Bob Private Curry',
        shareToken: 'bob-secret-share-token',
        shareEnabled: true,
        tags: ['curry'],
    }],
    [21, {
        id: 21,
        userId: 'bob',
        visibility: 'public',
        title: 'Bob Public Soup',
        shareToken: 'bob-public-share-token',
        shareEnabled: true,
        tags: ['soup'],
    }],
]);

const usersById = new Map([
    ['alice', {
        id: 'alice',
        email: 'alice@example.com',
        age: 31,
        username: 'alice',
        administrator: false,
        avatar: '/avatars/alice.png',
        language: 'en',
    }],
    ['bob', {
        id: 'bob',
        email: 'bob@example.com',
        age: 42,
        username: 'bob',
        administrator: true,
        avatar: '/avatars/bob.png',
        language: 'de',
    }],
]);

function buildRecipeRow(recipe, columns, extras) {
    const now = new Date('2026-01-01T00:00:00.000Z').toISOString();
    const rowByKey = {
        id: recipe.id,
        title: recipe.title,
        description: 'Delicious test recipe',
        sourceUrl: null,
        image: `/img/${recipe.id}.jpg`,
        createdAt: now,
        updatedAt: now,
        cookingTime: 25,
        servings: 2,
        userId: recipe.userId,
        viewCount: 10,
        visibility: recipe.visibility,
        shareToken: recipe.shareToken,
        shareEnabled: recipe.shareEnabled,
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        fiber: null,
    };
    return [
        ...Object.keys(columns).map(key => rowByKey[key]),
        ...extras,
    ];
}

const db = drizzle(async (sql, params) => {
    queries.push({sql, params});

    if (sql.startsWith('insert into "favorite"') || sql.startsWith('insert into "recipe_rating"')) {
        mutations.push({sql, params});
        return {rows: []};
    }

    if (sql.startsWith('update "recipes" set "view_count"')) {
        return {rows: []};
    }

    // getRecipeByShareToken: selects publicRecipeColumns + difficulty
    if (sql.includes('where ("recipes"."share_token" = $1 and "recipes"."share_enabled" = $2)')) {
        const match = [...recipesById.values()].find(r => r.shareToken === params[0] && r.shareEnabled === params[1]);
        return {rows: match ? [buildRecipeRow(match, recipeDb.publicRecipeColumns, ['easy'])] : []};
    }

    // getRecipeById: selects recipeColumns + difficulty + tags
    if (sql.includes('from "recipes" inner join "difficulty_to_recipe"') && sql.endsWith('where "recipes"."id" = $1')) {
        const recipe = recipesById.get(params[0]);
        return {rows: recipe ? [buildRecipeRow(recipe, recipeDb.recipeColumns, ['easy', recipe.tags])] : []};
    }

    // getCollectionRecipes: collection header lookup
    if (sql.startsWith('select "title", "user_id" from "collections" where "collections"."id" = $1')) {
        return {rows: [['Alice Collection', 'alice']]};
    }

    // getForYouRecipes: taste profile favorites lookup
    if (sql.startsWith('select "recipe_id" from "favorite" where ("favorite"."user_id" = $1 and "favorite"."favorite" = $2)')) {
        return {rows: [[10]]};
    }

    // getForYouRecipes: interacted recipe details lookup
    if (sql.startsWith('select "recipes"."id", "difficulty"."difficulty"') && sql.includes('where "recipes"."id" in')) {
        return {rows: [[10, 'easy', ['pasta']]]};
    }

    // getForYouRecipes: candidate recipes (publicRecipeColumns + difficulty + tags + averageRating + ratingCount)
    if (sql.includes('from "recipes" inner join "difficulty_to_recipe"') && sql.includes('AVG("recipe_rating"."rating")')) {
        return {rows: [buildRecipeRow(recipesById.get(21), recipeDb.publicRecipeColumns, ['easy', ['pasta'], 5, 3])]};
    }

    // getSimilarRecipes: candidate similar recipes (publicRecipeColumns + difficulty + tags + similarityScore)
    if (sql.includes('from "recipes" inner join "difficulty_to_recipe"') && sql.includes('having')) {
        return {rows: [buildRecipeRow(recipesById.get(21), recipeDb.publicRecipeColumns, ['easy', ['pasta'], 3])]};
    }

    // General recipe list / search / collection / favorite / user recipe queries using publicRecipeColumns
    if (sql.includes('from "recipes"') && sql.includes('inner join "difficulty_to_recipe"')) {
        return {rows: [buildRecipeRow(recipesById.get(21), recipeDb.publicRecipeColumns, ['easy', ['soup']])]};
    }

    // getRecipeRatingSummary
    if (sql.includes('from "recipe_rating"') && sql.includes('AVG(')) {
        return {rows: [[4.5, 2]]};
    }

    // getRecipeFavoriteState
    if (sql.startsWith('select "favorite" from "favorite"')) {
        return {rows: [[true]]};
    }

    // getUserRecipeRating
    if (sql.startsWith('select "rating" from "recipe_rating"')) {
        return {rows: [[4]]};
    }

    // getUserById
    if (sql.startsWith('select "id", "username", "avatar" from "user" where "user"."id" = $1')) {
        const u = usersById.get(params[0]);
        return {rows: u ? [[u.id, u.username, u.avatar]] : []};
    }

    // getLocaleByUserId
    if (sql.startsWith('select "language" from "user" where "user"."id" = $1')) {
        const u = usersById.get(params[0]);
        return {rows: u ? [[u.language]] : []};
    }

    return {rows: []};
});

const recipeDb = load('src/lib/server/db/recipe.ts', {
    '$lib/server/db/index': {getDb: () => db},
    '$lib/server/db/schema': schema,
    '$lib/server/utils': {getDifficultyId: () => 1},
    '$app/server': {getRequestEvent: () => currentEvent}
});

const userDb = load('src/lib/server/db/user.ts', {
    '$lib/server/db/index': {getDb: () => db},
    '$lib/server/db/schema': schema,
    '$lib/server/db/recipe': recipeDb,
});

const recipeSource = load('src/lib/recipe-source.ts');

const appServerMock = {
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
};

const recipeRemote = load('src/lib/functions/recipe.remote.ts', {
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
    '$app/server': appServerMock,
});

const utils = load('src/lib/utils.ts');

const userRemote = load('src/lib/functions/user.remote.ts', {
    'valibot': v,
    '$lib/server/db/user': userDb,
    '$lib/server/utils': {hashPassword: async pw => `hashed:${pw}`},
    '$lib/utils': utils,
    '$app/server': appServerMock,
});

describe('remote auth, shareToken isolation, private recipe guards, and user profile privacy', () => {
    beforeEach(() => {
        queries = [];
        mutations = [];
        currentEvent = {locals: {user: null}, params: {}};
    });

    test('all app-only remote queries reject unauthenticated requests without hitting the DB', async () => {
        const unauthenticatedCalls = [
            ['getRecentRecipes', () => recipeRemote.getRecentRecipes()],
            ['getPopularRecipes', () => recipeRemote.getPopularRecipes()],
            ['getDiscoverRecipes', () => recipeRemote.getDiscoverRecipes()],
            ['getRecipeById', () => recipeRemote.getRecipeById({id: 10})],
            ['getRecipeDetails', () => recipeRemote.getRecipeDetails({recipeId: 10})],
            ['getRecipesByUserId', () => recipeRemote.getRecipesByUserId({userId: 'alice'})],
            ['getSteps', () => recipeRemote.getSteps({recipeId: 10})],
            ['getIngredients', () => recipeRemote.getIngredients({recipeId: 10})],
            ['getTags', () => recipeRemote.getTags({recipeId: 10})],
            ['getRecipeRatingSummary', () => recipeRemote.getRecipeRatingSummary({recipeId: 10})],
            ['getSimilarRecipes', () => recipeRemote.getSimilarRecipes({recipeId: 10})],
            ['getLocaleByUserId', () => userRemote.getLocaleByUserId({userId: 'alice'})],
            ['getUserById', () => userRemote.getUserById({userId: 'bob'})],
        ];

        for (const [name, fn] of unauthenticatedCalls) {
            await assert.rejects(
                fn,
                {message: 'User not authenticated'},
                `${name} must reject unauthenticated requests`
            );
        }

        assert.equal(queries.length, 0, 'Unauthenticated app-only calls must not execute DB queries');
    });

    test('getSharedRecipeDetails and getRecipeByShareToken remain publicly accessible without login', async () => {
        const shared = await recipeRemote.getSharedRecipeDetails({
            token: 'bob-secret-share-token',
            incrementView: false,
        });

        assert.equal(shared.id, 20);
        assert.equal(shared.title, 'Bob Private Curry');
        assert.equal(shared.sharePath, '/share/bob-secret-share-token');
        assert.equal(shared.shareEnabled, true);
        assert.equal('shareToken' in shared, false, 'getSharedRecipeDetails must not return raw shareToken');

        const sharedRow = await recipeRemote.getRecipeByShareToken({
            token: 'bob-secret-share-token',
            incrementView: false,
        });
        assert.equal(sharedRow.id, 20);
        assert.equal('shareToken' in sharedRow, false, 'getRecipeByShareToken must not return raw shareToken');
    });

    test('recipe list/search/similar/byId queries omit shareToken while recipeColumns retains it for backup export', async () => {
        assert.ok('shareToken' in recipeDb.recipeColumns, 'recipeColumns must keep shareToken for backup export');
        assert.equal('shareToken' in recipeDb.publicRecipeColumns, false, 'publicRecipeColumns must omit shareToken');

        currentEvent = {locals: {user: {id: 'alice', administrator: false}}, params: {}};

        const dbCalls = [
            ['getRecipes', () => recipeDb.getRecipes(0, 10, 'recent', 'alice')],
            ['getRecentRecipes', () => recipeDb.getRecentRecipes()],
            ['getPopularRecipes', () => recipeDb.getPopularRecipes()],
            ['getDiscoverRecipes', () => recipeDb.getDiscoverRecipes()],
            ['searchRecipes', () => recipeDb.searchRecipes('soup', 'alice')],
            ['searchRecipesByIngredients', () => recipeDb.searchRecipesByIngredients('salt', 'alice')],
            ['getFavoriteRecipes', () => recipeDb.getFavoriteRecipes('alice')],
            ['getRecipesByUserId', () => recipeDb.getRecipesByUserId('bob', false)],
            ['getForYouRecipes', () => recipeDb.getForYouRecipes('alice')],
        ];

        for (const [name, fn] of dbCalls) {
            const before = queries.length;
            const rows = await fn();
            const selectSql = queries.slice(before).find(q => q.sql.includes('from "recipes"'))?.sql ?? '';
            assert.equal(
                selectSql.includes('"share_token"'),
                false,
                `${name} SQL must not select share_token`
            );
            assert.ok(rows.length > 0, `${name} should return mocked recipe rows`);
            for (const row of rows) {
                assert.equal('shareToken' in row, false, `${name} result must not contain shareToken`);
            }
        }

        // getCollectionRecipes
        const colBefore = queries.length;
        const collection = await recipeDb.getCollectionRecipes(1, 'alice');
        const colSql = queries.slice(colBefore).find(q => q.sql.includes('from "recipes"'))?.sql ?? '';
        assert.equal(colSql.includes('"share_token"'), false, 'getCollectionRecipes SQL must not select share_token');
        assert.equal('shareToken' in collection.recipes[0], false);

        // getSimilarRecipes (remote)
        const simBefore = queries.length;
        const similar = await recipeRemote.getSimilarRecipes({recipeId: 10, limit: 5});
        const simSelectSql = queries.slice(simBefore).find(q => q.sql.includes('having'))?.sql ?? '';
        assert.equal(simSelectSql.includes('"share_token"'), false, 'getSimilarRecipes SQL must not select share_token');
        assert.equal('shareToken' in similar[0], false);

        // getRecipeById (remote) strips shareToken
        const byId = await recipeRemote.getRecipeById({id: 21});
        assert.equal(byId.id, 21);
        assert.equal('shareToken' in byId, false, 'remote getRecipeById must not return shareToken');

        // getRecipeForEdit (remote) strips shareToken
        const forEdit = await recipeRemote.getRecipeForEdit({recipeId: 10});
        assert.equal(forEdit.id, 10);
        assert.equal('shareToken' in forEdit, false, 'remote getRecipeForEdit must not return shareToken');

        // getRecipeDetails (remote) strips shareToken and hides sharePath for non-owners
        const nonOwnerDetails = await recipeRemote.getRecipeDetails({recipeId: 21});
        assert.equal('shareToken' in nonOwnerDetails, false);
        assert.equal(nonOwnerDetails.sharePath, null);

        const ownerDetails = await recipeRemote.getRecipeDetails({recipeId: 10});
        assert.equal('shareToken' in ownerDetails, false);
        assert.equal(ownerDetails.sharePath, '/share/alice-secret-share-token');
    });

    test('private recipe interactions and similarity queries reject non-owners and rateRecipe rejects non-integers', async () => {
        currentEvent = {locals: {user: {id: 'alice', administrator: false}}, params: {}};

        await assert.rejects(() => recipeRemote.getSimilarRecipes({recipeId: 20}), {message: 'Recipe is private'});
        await assert.rejects(() => recipeRemote.likeRecipe({recipeId: 20}), {message: 'Recipe is private'});
        await assert.rejects(() => recipeRemote.rateRecipe({recipeId: 20, rating: 5}), {message: 'Recipe is private'});
        await assert.rejects(() => recipeRemote.getRecipeFavoriteState({recipeId: 20}), {message: 'Recipe is private'});
        await assert.rejects(() => recipeRemote.getUserRecipeRating({recipeId: 20}), {message: 'Recipe is private'});
        assert.equal(mutations.length, 0, 'Rejected private recipe interactions must not write to DB');

        // Non-integer rating must be rejected by valibot before touching DB
        const beforeRating = queries.length;
        await assert.rejects(
            () => recipeRemote.rateRecipe({recipeId: 10, rating: 3.5}),
            v.ValiError,
            'rateRecipe must reject fractional ratings'
        );
        assert.equal(queries.length, beforeRating);

        // Valid integer rating on visible recipe succeeds
        const rated = await recipeRemote.rateRecipe({recipeId: 21, rating: 4});
        assert.equal(rated.rating, 4);
        assert.equal(mutations.length, 1);

        // Owner can still interact with own private recipe
        currentEvent = {locals: {user: {id: 'bob', administrator: false}}, params: {}};
        const ownFav = await recipeRemote.getRecipeFavoriteState({recipeId: 20});
        assert.equal(ownFav, true);
        const ownRating = await recipeRemote.getUserRecipeRating({recipeId: 20});
        assert.equal(ownRating, 4);
        await recipeRemote.likeRecipe({recipeId: 20});
        assert.equal(mutations.length, 2);
    });

    test('getUserById exposes only public profile fields and getLocaleByUserId enforces owner/admin access', async () => {
        currentEvent = {locals: {user: {id: 'alice', administrator: false}}, params: {}};

        const profile = await userRemote.getUserById({userId: 'bob'});
        assert.deepEqual(profile, {
            id: 'bob',
            username: 'bob',
            avatar: '/avatars/bob.png',
        });
        assert.equal('email' in profile, false);
        assert.equal('age' in profile, false);
        assert.equal('administrator' in profile, false);
        assert.equal('language' in profile, false);

        const userSql = queries.at(-1)?.sql ?? '';
        assert.equal(userSql.includes('"email"'), false);
        assert.equal(userSql.includes('"age"'), false);
        assert.equal(userSql.includes('"administrator"'), false);
        assert.equal(userSql.includes('"language"'), false);

        // Non-owner non-admin cannot read another user's locale
        await assert.rejects(
            () => userRemote.getLocaleByUserId({userId: 'bob'}),
            {message: 'User not authorized'}
        );

        // Owner can read own locale
        assert.equal(await userRemote.getLocaleByUserId({userId: 'alice'}), 'en');

        // Admin can read another user's locale
        currentEvent = {locals: {user: {id: 'bob', administrator: true}}, params: {}};
        assert.equal(await userRemote.getLocaleByUserId({userId: 'alice'}), 'en');
    });
});
