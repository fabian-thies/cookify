import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

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
const languages = load('src/lib/types/languages.ts', {
    '$lib/constants': constants
});
const {resolveAppLocale} = load('src/lib/server/locale.ts', {
    '$lib/types/languages': languages
});

assert.equal(resolveAppLocale('de'), 'de');
assert.equal(resolveAppLocale(' ES '), 'es');
assert.equal(resolveAppLocale(undefined), 'en');
assert.equal(resolveAppLocale('fr', 'invalid'), 'en');
assert.equal(resolveAppLocale('de', 'es'), 'es');
assert.equal(resolveAppLocale('de', 'es', 'en'), 'en');
assert.equal(resolveAppLocale('de', undefined, 'es'), 'es');
assert.equal(resolveAppLocale('de', 'invalid', 'invalid'), 'de');
console.log('Locale priority checks passed');
