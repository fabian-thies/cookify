import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function loadModule(path, imports = {}) {
    const source = ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
    }).outputText;
    const exports = {};
    const fn = vm.compileFunction(source, ['exports', 'require'], {filename: path});
    fn(exports, name => name in imports ? imports[name] : require(name));
    return exports;
}

const recipeSource = loadModule('src/lib/recipe-source.ts');
const {parseRecipeFormData} = loadModule('src/lib/server/utils.ts', {
    '../recipe-source': recipeSource
});

function buildFormData(overrides = {}) {
    const data = new FormData();
    const fields = {
        title: 'No-Cook Salad',
        description: '',
        cookTime: '0',
        servings: '2',
        difficulty: 'easy',
        ...overrides
    };
    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
            data.set(key, value);
        }
    }
    return data;
}

test('parseRecipeFormData accepts empty description and cookTime = 0', () => {
    const parsed = parseRecipeFormData(buildFormData({description: '', cookTime: '0'}));
    assert.equal(parsed.title, 'No-Cook Salad');
    assert.equal(parsed.description, '');
    assert.equal(parsed.cookTime, 0);
    assert.equal(parsed.servings, 2);
    assert.equal(parsed.difficulty, 'easy');
    assert.deepEqual(parsed.ingredientsList, []);
    assert.deepEqual(parsed.steps, []);
});

test('parseRecipeFormData accepts omitted description', () => {
    const parsed = parseRecipeFormData(buildFormData({description: undefined, cookTime: '15'}));
    assert.equal(parsed.description, '');
    assert.equal(parsed.cookTime, 15);
});

test('parseRecipeFormData rejects invalid cookTime values', () => {
    for (const cookTime of [undefined, '', '   ', '-1', '1.5', 'abc', 'Infinity']) {
        assert.throws(
            () => parseRecipeFormData(buildFormData({cookTime})),
            /Invalid cook time/,
            `Expected cookTime=${JSON.stringify(cookTime)} to be rejected`
        );
    }
});

test('parseRecipeFormData rejects invalid servings values', () => {
    for (const servings of [undefined, '', '   ', '0', '-2', '2.5', 'abc']) {
        assert.throws(
            () => parseRecipeFormData(buildFormData({servings})),
            /Invalid servings/,
            `Expected servings=${JSON.stringify(servings)} to be rejected`
        );
    }
});

test('parseRecipeFormData rejects empty title', () => {
    for (const title of [undefined, '', '   ']) {
        assert.throws(() => parseRecipeFormData(buildFormData({title})));
    }
});

test('parseRecipeFormData rejects mismatched ingredients_amount[] and ingredients_name[] lengths', () => {
    const moreAmounts = buildFormData();
    moreAmounts.append('ingredients_amount[]', '100');
    moreAmounts.append('ingredients_amount[]', '200');
    moreAmounts.append('ingredients_name[]', 'Flour');
    assert.throws(() => parseRecipeFormData(moreAmounts), /Mismatched ingredients/);

    const moreNames = buildFormData();
    moreNames.append('ingredients_amount[]', '100');
    moreNames.append('ingredients_name[]', 'Flour');
    moreNames.append('ingredients_name[]', 'Sugar');
    assert.throws(() => parseRecipeFormData(moreNames), /Mismatched ingredients/);

    const blankAmount = buildFormData();
    blankAmount.append('ingredients_amount[]', '');
    blankAmount.append('ingredients_name[]', 'Flour');
    assert.throws(() => parseRecipeFormData(blankAmount));
});

test('parseRecipeFormData defaults missing ingredients_unit[] entry to empty string', () => {
    const data = buildFormData();
    data.append('ingredients_amount[]', '2');
    data.append('ingredients_amount[]', '100');
    data.append('ingredients_unit[]', 'pcs');
    data.append('ingredients_name[]', 'Eggs');
    data.append('ingredients_name[]', 'Flour');

    const parsed = parseRecipeFormData(data);
    assert.deepEqual(parsed.ingredientsList, [
        {amount: 2, unit: 'pcs', name: 'Eggs'},
        {amount: 100, unit: '', name: 'Flour'}
    ]);
});

test('createRecipe and updateRecipe do not crash or insert empty arrays when ingredientsList or steps are empty', async () => {
    const constants = loadModule('src/lib/constants.ts');
    const shoppingList = loadModule('src/lib/shopping-list.ts');
    const schema = loadModule('src/lib/server/db/schema.ts', {
        '../../constants': constants,
        '../../shopping-list': shoppingList
    });

    const insertedTables = [];
    const tx = {
        select: () => ({from: () => ({where: async () => [{userId: 'owner'}]})}),
        update: () => ({set: () => ({where: async () => []})}),
        delete: () => ({where: async () => []}),
        insert: (table) => ({
            values: (vals) => {
                if (Array.isArray(vals) && vals.length === 0) {
                    throw new Error('Empty values array passed to db.insert');
                }
                insertedTables.push(table);
                return {
                    returning: async () => [{id: 42}],
                    then: (resolve, reject) => Promise.resolve([]).then(resolve, reject)
                };
            }
        })
    };

    const recipeDb = loadModule('src/lib/server/db/recipe.ts', {
        '$lib/server/db/index': {getDb: () => ({transaction: (cb) => cb(tx)})},
        '$lib/server/db/schema': schema,
        '$lib/server/utils': {getDifficultyId: () => 1},
        '$app/server': {}
    });

    const emptyDraft = {
        id: 42,
        userId: 'owner',
        title: 'Quick Snack',
        description: '',
        cookTime: 0,
        servings: 1,
        difficulty: 'easy',
        visibility: 'private',
        image: '',
        ingredientsList: [],
        steps: [],
        tags: [],
        tips: []
    };

    const created = await recipeDb.createRecipe(emptyDraft);
    assert.deepEqual(created, [{id: 42}]);
    assert.ok(!insertedTables.includes(schema.ingredients), 'createRecipe must skip ingredients insert when empty');
    assert.ok(!insertedTables.includes(schema.steps), 'createRecipe must skip steps insert when empty');

    insertedTables.length = 0;
    const updated = await recipeDb.updateRecipe(emptyDraft);
    assert.deepEqual(updated, {id: 42});
    assert.ok(!insertedTables.includes(schema.ingredients), 'updateRecipe must skip ingredients insert when empty');
    assert.ok(!insertedTables.includes(schema.steps), 'updateRecipe must skip steps insert when empty');
});

test('recipe.remote.ts does not export unused createRecipe or updateRecipe commands', () => {
    const command = (schema, handler) => ({schema, handler});
    const query = (schemaOrFn, handler) => ({schemaOrFn, handler});
    const remote = loadModule('src/lib/functions/recipe.remote.ts', {
        '@sveltejs/kit': {error: (status, message) => { throw new Error(`${status}: ${message}`); }},
        '$lib/server/db': {},
        '$lib/server/db/schema': {},
        '$app/server': {command, query, getRequestEvent: () => ({locals: {user: {id: 'u1'}}})},
        '$lib/server/db/recipe': {}
    });

    assert.equal('createRecipe' in remote, false, 'recipe.remote.ts must not export createRecipe');
    assert.equal('updateRecipe' in remote, false, 'recipe.remote.ts must not export updateRecipe');
});

test('Ingredients.svelte two-way binds item.unit', () => {
    const source = readFileSync('src/lib/components/recipe/form/Ingredients.svelte', 'utf8');
    assert.match(source, /name="ingredients_unit\[\]"[\s\S]*?bind:value=\{item\.unit\}/);
    assert.doesNotMatch(source, /value=\{item\.unit \|\| ''\}/);
});
