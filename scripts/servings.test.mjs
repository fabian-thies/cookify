import assert from 'node:assert/strict';
import {parseServings, scaleIngredientQuantity, servingsQuery} from '../src/lib/servings.ts';

for (const invalid of [null, undefined, '', '-1', '1.5', '1e2', '1000', NaN, Infinity]) {
    assert.equal(parseServings(invalid), undefined);
}
assert.equal(parseServings('4'), 4);
assert.equal(parseServings(999), 999);
assert.equal(servingsQuery(parseServings('4')), '?servings=4');
assert.equal(servingsQuery(parseServings('bad')), '');
assert.equal(scaleIngredientQuantity(500, 2, 4), '1000');
assert.equal(scaleIngredientQuantity(1, 3, 2), '0.67');
assert.equal(scaleIngredientQuantity(5, 0, 2), '5');
assert.equal(scaleIngredientQuantity(null, 2, 4), '');
assert.equal(scaleIngredientQuantity(undefined, 2, 4), '');
