import assert from 'node:assert/strict';
import {promises as fs, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
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
const shoppingList = load('src/lib/shopping-list.ts');
const schema = load('src/lib/server/db/schema.ts', {
    '../../constants': constants,
    '../../shopping-list': shoppingList
});
let activeDb = db;
let deletedImages = [];
let deleteImageImpl = async imageUrl => {
    deletedImages.push(imageUrl);
};
const recipes = load('src/lib/server/db/recipe.ts', {
    '$lib/server/db/index': {getDb: () => activeDb},
    '$lib/server/db/schema': schema,
    '$lib/server/utils': {getDifficultyId: () => 1},
    '$lib/server/image': {deleteImage: imageUrl => deleteImageImpl(imageUrl)},
    '$app/server': {}
});

assert.equal(schema.ingredients.quantity.getSQLType(), 'double precision', 'Fractional amounts must survive storage');
assert.equal(schema.ingredients.quantity.notNull, false, 'Ingredient quantities must be optional');

await recipes.getRecipes();
assert.deepEqual(queries.at(-1).params, ['public']);
await recipes.getRecipes(0, undefined, undefined, 'owner');
assert.deepEqual(queries.at(-1).params, ['public', 'owner']);
assert.match(queries.at(-1).sql, /"recipes"\."visibility" = \$1 or "recipes"\."user_id" = \$2/);

await recipes.getRecipes(24, 25, 'rating', 'owner', {difficulty: 'hard', cookTime: '60+', tag: 'pasta', author: 'user'});
assert.match(queries.at(-1).sql, /"difficulty"\."difficulty" = \$3/);
assert.match(queries.at(-1).sql, /"recipes"\."cooking_time" > \$4/);
assert.match(queries.at(-1).sql, /LOWER\("tags"\."name"\) = LOWER\(\$5\)/);
assert.match(queries.at(-1).sql, /"recipes"\."user_id" = \$6/);
assert.match(queries.at(-1).sql, /AVG\("recipe_rating"\."rating"\)::float[\s\S]*DESC NULLS LAST/);
assert.match(queries.at(-1).sql, /limit \$7 offset \$8/);
assert.deepEqual(queries.at(-1).params, ['public', 'owner', 'hard', 60, 'pasta', 'owner', 25, 24]);

await recipes.getRecipes(0, 24, 'cookTime', 'owner');
assert.match(queries.at(-1).sql, /order by "recipes"\."cooking_time" asc, "recipes"\."created_at" desc, "recipes"\."id" desc/);

await recipes.getRecipes(0, 24, 'lastCooked', 'owner');
assert.match(queries.at(-1).sql, /MAX\("cook_history"\."cooked_at"\)[\s\S]*"cook_history"\."user_id" = \$3[\s\S]*DESC NULLS LAST/);
assert.deepEqual(queries.at(-1).params, ['public', 'owner', 'owner', 24]);

await recipes.getFavoriteRecipes('owner');
assert.deepEqual(queries.at(-1).params, ['owner', true, 'public', 'owner']);
assert.match(queries.at(-1).sql, /"favorite"\."user_id" = \$1/);
assert.match(queries.at(-1).sql, /"recipes"\."visibility" = \$3 or "recipes"\."user_id" = \$4/);

await recipes.getFavoriteRecipes('owner', 'lastCooked');
assert.match(queries.at(-1).sql, /MAX\("cook_history"\."cooked_at"\)/);

collectionOwner = 'other';
const before = queries.length;
await assert.rejects(recipes.getCollectionRecipes(1, 'owner'), /Collection not found/);
assert.equal(queries.length, before + 1, 'Unauthorized access must stop before fetching collection recipes');
collectionOwner = 'owner';
await recipes.getCollectionRecipes(1, 'owner');
assert.deepEqual(queries.at(-1).params, [1, 'public', 'owner']);

await recipes.getSteps(42);
assert.deepEqual(queries.at(-1).params, [42]);
assert.match(queries.at(-1).sql, /order by "steps"\."number" asc, "steps"\."id" asc/);

await recipes.getIngredients(42);
assert.deepEqual(queries.at(-1).params, [42]);
assert.match(queries.at(-1).sql, /order by "ingredients"\."id" asc/);
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

const shoppingDb = drizzle(async (sql, params) => {
    queries.push({sql, params});
    if (sql.includes('sum(')) return {rows: [['Tomatoes', 800, 'g']]};
    if (sql.startsWith('insert into "shopping_list_items"')) return {rows: [[1]]};
    return {rows: []};
});
activeDb = {transaction: callback => callback(shoppingDb), update: shoppingDb.update.bind(shoppingDb)};
const shopping = load('src/lib/server/db/shopping-list.ts', {
    '$lib/server/db/index': {getDb: () => activeDb},
    '$lib/server/db/schema': schema,
    '$lib/shopping-list': shoppingList
});
await shopping.getWeeklyShoppingList('owner', 'owner', '2026-11-23');
const upsert = queries.find(({sql}) => sql.startsWith('insert into "shopping_list_items"'));
assert.match(upsert.sql, /"checked" = "shopping_list_items"\."checked" and not \(\(excluded\.quantity - "shopping_list_items"\."quantity"\) >/);
assert.match(upsert.sql, /"already_have" = "shopping_list_items"\."already_have" and not/);
assert.match(upsert.sql, /"quantity_increased" = "shopping_list_items"\."quantity_increased" or \(\("shopping_list_items"\."checked" or "shopping_list_items"\."already_have"\) and/);
assert.ok(upsert.params.includes(800));
assert.equal(await shopping.changeShoppingItemStatus('owner', 'owner', '2026-11-23', 1, {checked: false, alreadyHave: false, quantity: 500}, 'bought'), false);
assert.match(queries.at(-1).sql, /not \(\("shopping_list_items"\."quantity" - cast\(\$\d+ as double precision\)\) >/);
assert.ok(queries.at(-1).params.includes(500));
assert.equal((await shopping.getWeeklyShoppingList('other', 'owner', '2026-11-23')).accessible, false);
await assert.rejects(shopping.addManualShoppingItem('other', 'owner', '2026-11-23', 'Soap'), /unavailable/);
console.log('Shopping list amount-change checks passed');

// deleteRecipe upload cleanup checks
{
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cookify-delete-recipe-test-'));
    try {
        const uploadDir = path.join(tempRoot, 'uploads');
        await fs.mkdir(uploadDir, {recursive: true});

        const imagesLib = load('src/lib/images.ts');
        const imageSource = ts.transpileModule(readFileSync('src/lib/server/image.ts', 'utf8'), {
            compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}
        }).outputText;
        const imageExports = {};
        vm.runInNewContext(imageSource, {
            exports: imageExports,
            Buffer,
            File,
            URL,
            process: {...process, cwd: () => tempRoot},
            console: {error() {}, log() {}},
            require: name => ({
                './remote-image': {downloadImage: async () => { throw new Error('unused'); }},
                'heic-convert': async () => new ArrayBuffer(0),
                '$lib/images': imagesLib
            })[name] ?? require(name)
        }, {filename: 'src/lib/server/image.ts'});

        const targetId = '11111111-2222-3333-4444-555555555555';
        const keepId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        const targetFiles = [
            `${targetId}.jpg`,
            `${targetId}-thumb.webp`,
            `${targetId}-medium.webp`,
            `${targetId}-large.webp`
        ];
        for (const name of [...targetFiles, `${keepId}.jpg`, `${keepId}-thumb.webp`]) {
            await fs.writeFile(path.join(uploadDir, name), 'img');
        }

        const makeDeleteDb = ({owner = 'owner', image = `/uploads/${targetId}.jpg`, shared = false, failDelete = false} = {}) => {
            const txDb = drizzle(async (sql) => {
                if (sql.startsWith('select "user_id", "image" from "recipes"')) {
                    return {rows: owner ? [[owner, image]] : []};
                }
                if (sql.startsWith('delete from "recipes"')) {
                    if (failDelete) throw new Error('delete failed');
                    return {rows: [[99]]};
                }
                if (sql.startsWith('select "id" from "recipes" where "recipes"."image"')) {
                    return {rows: shared ? [[100]] : []};
                }
                return {rows: []};
            });
            return {transaction: cb => cb(txDb)};
        };

        deleteImageImpl = imageExports.deleteImage;

        // 1. Unauthorized deletion must not touch files.
        activeDb = makeDeleteDb({owner: null});
        await assert.rejects(recipes.deleteRecipe('other', 99), /Insufficient permissions/);
        await fs.access(path.join(uploadDir, `${targetId}.jpg`));

        // 2. Failed transaction must not delete files.
        activeDb = makeDeleteDb({failDelete: true});
        await assert.rejects(
            recipes.deleteRecipe('owner', 99),
            err => /delete failed/.test(err.cause?.message ?? err.message)
        );
        await fs.access(path.join(uploadDir, `${targetId}.jpg`));

        // 3. Shared image referenced by another recipe must stay on disk.
        activeDb = makeDeleteDb({shared: true});
        await recipes.deleteRecipe('owner', 99);
        await fs.access(path.join(uploadDir, `${targetId}.jpg`));

        // 4. Successful deletion removes original + all WebP variants while leaving unrelated uploads intact.
        activeDb = makeDeleteDb({shared: false});
        const deleted = await recipes.deleteRecipe('owner', 99);
        assert.deepEqual(deleted, [{id: 99}]);
        for (const name of targetFiles) {
            await assert.rejects(fs.access(path.join(uploadDir, name)), {code: 'ENOENT'});
        }
        await fs.access(path.join(uploadDir, `${keepId}.jpg`));
        await fs.access(path.join(uploadDir, `${keepId}-thumb.webp`));
        console.log('Recipe delete upload cleanup checks passed');
    } finally {
        await fs.rm(tempRoot, {recursive: true, force: true});
    }
}
