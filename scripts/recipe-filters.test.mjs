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

const filters = load('src/lib/recipe-filters.ts');

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
