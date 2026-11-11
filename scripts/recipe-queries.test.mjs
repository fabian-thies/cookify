import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {drizzle} from 'drizzle-orm/pg-proxy';

const require = createRequire(import.meta.url);
const queries = [];
let collectionOwner = 'owner';
const db = drizzle(async (sql, params) => {
    queries.push({sql, params});
    return {rows: sql.startsWith('select "title", "user_id"') ? [['Collection', collectionOwner]] : []};
});

// Exercise the real query builders without connecting to a user's database.
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
const schema = load('src/lib/server/db/schema.ts', {'../../constants': constants});
let activeDb = db;
const recipes = load('src/lib/server/db/recipe.ts', {
    '$lib/server/db/index': {getDb: () => activeDb},
    '$lib/server/db/schema': schema,
    '$lib/server/utils': {getDifficultyId: () => 1},
    '$app/server': {}
});

assert.equal(schema.ingredients.quantity.getSQLType(), 'double precision', 'Fractional amounts must survive storage');

await recipes.getRecipes();
assert.deepEqual(queries.at(-1).params, ['public']);
await recipes.getRecipes(0, undefined, undefined, 'owner');
assert.deepEqual(queries.at(-1).params, ['public', 'owner']);
assert.match(queries.at(-1).sql, /"recipes"\."visibility" = \$1 or "recipes"\."user_id" = \$2/);

await recipes.getFavoriteRecipes('owner');
assert.deepEqual(queries.at(-1).params, ['owner', true, 'public', 'owner']);
assert.match(queries.at(-1).sql, /"favorite"\."user_id" = \$1/);
assert.match(queries.at(-1).sql, /"recipes"\."visibility" = \$3 or "recipes"\."user_id" = \$4/);

collectionOwner = 'other';
const before = queries.length;
await assert.rejects(recipes.getCollectionRecipes(1, 'owner'), /Collection not found/);
assert.equal(queries.length, before + 1, 'Unauthorized access must stop before fetching collection recipes');
collectionOwner = 'owner';
await recipes.getCollectionRecipes(1, 'owner');
assert.deepEqual(queries.at(-1).params, [1, 'public', 'owner']);
console.log('Recipe query checks passed');

let rollbacks = 0;
const transaction = {
    select: () => ({from: () => ({where: async () => [{userId: 'owner'}]})}),
    update: () => ({set: () => ({where: async () => []})}),
    delete: () => ({where: async () => []}),
    insert: table => ({values: () => ({
        returning: async () => [{id: 1}],
        then: (resolve, reject) => table === schema.ingredients
            ? Promise.reject(new Error('ingredient insert failed')).then(resolve, reject)
            : Promise.resolve([]).then(resolve, reject)
    })})
};
activeDb = {transaction: async callback => {
    try { return await callback(transaction); }
    catch (error) { rollbacks++; throw error; }
}};
const draft = {
    id: 1, userId: 'owner', title: 'Pasta', description: '', cookTime: 10, servings: 2,
    difficulty: 'easy', visibility: 'private', image: '',
    ingredientsList: [{name: 'Pasta', amount: 0.5, unit: 'kg'}], steps: ['Cook'], tags: [], tips: []
};
await assert.rejects(recipes.createRecipe(draft), /ingredient insert failed/);
await assert.rejects(recipes.updateRecipe(draft), /ingredient insert failed/);
assert.equal(rollbacks, 2, 'Failed recipe writes must reject inside a transaction');
console.log('Recipe transaction checks passed');
