import assert from 'node:assert/strict';
import {resolveAppLocale} from '../src/lib/server/locale.ts';

assert.equal(resolveAppLocale('de'), 'de');
assert.equal(resolveAppLocale(' ES '), 'es');
assert.equal(resolveAppLocale(undefined), 'en');
assert.equal(resolveAppLocale('fr', 'invalid'), 'en');
assert.equal(resolveAppLocale('de', 'es'), 'es');
assert.equal(resolveAppLocale('de', 'es', 'en'), 'en');
assert.equal(resolveAppLocale('de', undefined, 'es'), 'es');
assert.equal(resolveAppLocale('de', 'invalid', 'invalid'), 'de');
console.log('Locale priority checks passed');
