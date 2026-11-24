import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe, test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function load(filePath, imports = {}) {
    const source = ts.transpileModule(readFileSync(filePath, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
    }).outputText;
    const exports = {};
    vm.runInNewContext(source, {
        exports,
        URL,
        URLSearchParams,
        require: name => name in imports ? imports[name] : require(name)
    }, {filename: filePath});
    return exports;
}

const constants = load('src/lib/constants.ts');
const filters = load('src/lib/recipe-filters.ts', {
    './constants': constants
});

describe('matchesCookTimeFilter', () => {
    test('handles every cook time range including > 60 minutes', () => {
        assert.equal(filters.matchesCookTimeFilter(0, ''), true);
        assert.equal(filters.matchesCookTimeFilter(90, ''), true);

        assert.equal(filters.matchesCookTimeFilter(0, '0-15'), true);
        assert.equal(filters.matchesCookTimeFilter(15, '0-15'), true);
        assert.equal(filters.matchesCookTimeFilter(16, '0-15'), false);

        assert.equal(filters.matchesCookTimeFilter(15, '15-30'), false);
        assert.equal(filters.matchesCookTimeFilter(16, '15-30'), true);
        assert.equal(filters.matchesCookTimeFilter(30, '15-30'), true);
        assert.equal(filters.matchesCookTimeFilter(31, '15-30'), false);

        assert.equal(filters.matchesCookTimeFilter(30, '30-60'), false);
        assert.equal(filters.matchesCookTimeFilter(45, '30-60'), true);
        assert.equal(filters.matchesCookTimeFilter(60, '30-60'), true);
        assert.equal(filters.matchesCookTimeFilter(61, '30-60'), false);

        assert.equal(filters.matchesCookTimeFilter(60, '60+'), false);
        assert.equal(filters.matchesCookTimeFilter(61, '60+'), true);
        assert.equal(filters.matchesCookTimeFilter(180, '60+'), true);
    });
});

describe('recipe filter query parameter synchronization', () => {
    test('parseRecipeFilterParams reads valid filters and sort and ignores invalid values', () => {
        const params = new URLSearchParams('q=pasta&cookTime=60%2B&difficulty=hard&tag=italian&author=user&ingredientsOnly=1&sort=rating');
        assert.deepEqual(
            {...filters.parseRecipeFilterParams(params, {allowIngredientsOnly: true})},
            {
                search: 'pasta',
                ingredientsOnly: true,
                difficulty: 'hard',
                cookTime: '60+',
                tag: 'italian',
                author: 'user',
                sort: 'rating'
            }
        );

        const invalid = new URLSearchParams('cookTime=999&difficulty=extreme&author=other&ingredientsOnly=1&sort=random');
        assert.deepEqual(
            {...filters.parseRecipeFilterParams(invalid, {fallbackTag: 'vegan', allowIngredientsOnly: false})},
            {
                search: '',
                ingredientsOnly: false,
                difficulty: '',
                cookTime: '',
                tag: 'vegan',
                author: '',
                sort: 'recent'
            }
        );
    });

    test('applyRecipeFilterParams mirrors active filters and sort and removes defaults while keeping unrelated params', () => {
        const base = new URL('https://cookify.example/recipe/search?foo=bar');
        const withFilters = filters.applyRecipeFilterParams(base, {
            search: '  risotto ',
            ingredientsOnly: true,
            difficulty: 'medium',
            cookTime: '60+',
            tag: 'dinner',
            author: 'user',
            sort: 'lastCooked'
        }, {allowIngredientsOnly: true});

        assert.equal(withFilters.searchParams.get('foo'), 'bar');
        assert.equal(withFilters.searchParams.get('q'), 'risotto');
        assert.equal(withFilters.searchParams.get('difficulty'), 'medium');
        assert.equal(withFilters.searchParams.get('cookTime'), '60+');
        assert.equal(withFilters.searchParams.get('tag'), 'dinner');
        assert.equal(withFilters.searchParams.get('author'), 'user');
        assert.equal(withFilters.searchParams.get('ingredientsOnly'), '1');
        assert.equal(withFilters.searchParams.get('sort'), 'lastCooked');

        const cleared = filters.applyRecipeFilterParams(withFilters, {
            search: '   ',
            ingredientsOnly: false,
            difficulty: '',
            cookTime: '',
            tag: '',
            author: 'all',
            sort: 'recent'
        }, {allowIngredientsOnly: true});

        assert.equal(cleared.search, '?foo=bar');
    });
});
