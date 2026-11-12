import assert from 'node:assert/strict';
import { categorizeIngredient, SHOPPING_CATEGORIES } from '../src/lib/shopping-list.ts';

const cases = [
    ['Hähnchenbrust', 'meat_fish'],
    ['Rinderhackfleisch', 'meat_fish'],
    ['Lachsfilet', 'meat_fish'],
    ['Milch', 'dairy_eggs'],
    ['Eier', 'dairy_eggs'],
    ['Parmesan', 'dairy_eggs'],
    ['Vollkornbrot', 'bakery'],
    ['Brötchen', 'bakery'],
    ['Äpfel', 'produce'],
    ['Möhren', 'produce'],
    ['Frühlingszwiebeln', 'produce'],
    ['Eisbergsalat', 'produce'],
    ['Preiselbeere', 'produce'],
    ['Paprikapulver', 'pantry'],
    ['Tomatenmark', 'pantry'],
    ['Kokosmilch', 'pantry'],
    ['Erdnussbutter', 'pantry'],
    ['Haferflocken', 'pantry'],
    ['Spaghetti', 'pantry'],
    ['Olivenöl', 'pantry'],
    ['TK-Erbsen', 'frozen'],
    ['Eis', 'frozen'],
    ['Apfelsaft', 'drinks'],
    ['Mineralwasser', 'drinks'],
    ['Drachenfrucht', 'other'],
];

for (const [name, expected] of cases) {
    assert.equal(categorizeIngredient(name), expected, `${name} should be ${expected}`);
}

assert.equal(new Set(SHOPPING_CATEGORIES).size, SHOPPING_CATEGORIES.length, 'Categories must be unique');
console.log(`Shopping list categorization checks passed (${cases.length} cases)`);
