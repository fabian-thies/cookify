import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe, test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function loadTsModule(path, imports = {}) {
    const exports = {};
    const transpiled = ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
    }).outputText;
    vm.runInNewContext(transpiled, {
        exports,
        Buffer,
        File,
        URL,
        AbortSignal,
        console: {error() {}, log() {}},
        require: (name) => (name in imports ? imports[name] : require(name)),
    }, {filename: path});
    return exports;
}

const scraper = loadTsModule('src/lib/server/scraper/index.ts', {
    '../remote-image.js': {
        fetchPublicResource: async () => {
            throw new Error('Network should not be called in HTML scraper unit tests');
        },
        UnsafeRemoteUrlError: class UnsafeRemoteUrlError extends Error {},
    },
});

const {extractFromJsonLd, scrapeRecipeFromHtml} = scraper;

function extractHandleImportFunction() {
    const source = readFileSync('src/routes/(app)/recipe/create/+page.svelte', 'utf8');
    const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    assert.ok(scriptMatch, 'Expected <script> block in create/+page.svelte');
    const script = scriptMatch[1];

    const start = script.indexOf('async function handleImport(');
    assert.notEqual(start, -1, 'Expected handleImport function in create/+page.svelte');

    let depth = 0;
    let seenBrace = false;
    let end = -1;
    for (let i = start; i < script.length; i++) {
        if (script[i] === '{') {
            depth++;
            seenBrace = true;
        } else if (script[i] === '}') {
            depth--;
            if (seenBrace && depth === 0) {
                end = i + 1;
                break;
            }
        }
    }
    assert.notEqual(end, -1, 'Could not find closing brace for handleImport');

    const fnSource = `${script.slice(start, end)}\nexports.handleImport = handleImport;`;
    const transpiled = ts.transpileModule(fnSource, {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
    }).outputText;

    return {source, transpiled};
}

function runHandleImport(recipe, fetchImpl) {
    const {transpiled} = extractHandleImportFunction();
    const exports = {};
    const events = [];
    const pictureInput = {
        id: 'picture',
        name: 'picture',
        files: null,
        dispatchEvent(event) {
            events.push(event);
            return true;
        }
    };
    const fallbackInput = {
        name: 'picture',
        files: null,
        dispatchEvent() {
            throw new Error('Should prefer #picture over hidden [name="picture"]');
        }
    };
    const queriedSelectors = [];
    const formEl = {
        querySelector(selector) {
            queriedSelectors.push(selector);
            if (selector === '#picture') return pictureInput;
            if (selector === '[name="picture"]') return fallbackInput;
            return null;
        }
    };

    class MockDataTransfer {
        constructor() {
            this._items = [];
            this.items = {
                add: (file) => this._items.push(file)
            };
        }
        get files() {
            return this._items;
        }
    }

    const context = {
        exports,
        fetch: fetchImpl,
        File,
        Blob,
        Event,
        DataTransfer: MockDataTransfer,
        document: {
            querySelector(selector) {
                if (selector === 'form[enctype="multipart/form-data"]') return formEl;
                return null;
            }
        },
        sourceUrl: '',
        difficulty: undefined,
        ingredients: [],
        steps: [],
        tags: [],
        tips: [],
    };

    vm.runInNewContext(transpiled, context, {filename: 'create-page-handleImport.ts'});
    return exports.handleImport(recipe).then(() => ({pictureInput, fallbackInput, events, queriedSelectors}));
}

describe('recipe scraper JSON-LD parsing', () => {
    test('extracts recipe from top-level JSON-LD array', () => {
        const html = `<!doctype html>
<html>
<head>
<script type="application/ld+json">
[
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Cooking Blog"
  },
  {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "name": "Lemon Risotto",
    "description": "Creamy citrus risotto",
    "image": "https://cdn.example.com/risotto.jpg",
    "cookTime": "PT35M",
    "recipeYield": "4 servings",
    "recipeIngredient": ["300 g arborio rice", "1 lemon"],
    "recipeInstructions": [
      {"@type": "HowToStep", "text": "Toast the rice."},
      {"@type": "HowToStep", "text": "Add warm stock gradually."}
    ],
    "recipeCategory": "Main Course",
    "keywords": "italian, risotto"
  }
]
</script>
</head>
<body></body>
</html>`;

        const recipe = scrapeRecipeFromHtml(html, 'https://example.com/recipes/lemon-risotto');
        assert.ok(recipe);
        assert.equal(recipe.title, 'Lemon Risotto');
        assert.equal(recipe.description, 'Creamy citrus risotto');
        assert.equal(recipe.image, 'https://cdn.example.com/risotto.jpg');
        assert.equal(recipe.cookTime, 35);
        assert.equal(recipe.servings, 4);
        assert.equal(recipe.ingredients.length, 2);
        assert.deepEqual(Array.from(recipe.steps), ['Toast the rice.', 'Add warm stock gradually.']);
        assert.deepEqual(Array.from(recipe.tags), ['Main Course', 'italian', 'risotto']);
        assert.equal(recipe.sourceUrl, 'https://example.com/recipes/lemon-risotto');
    });

    test('prefers titled Recipe over title-less Recipe stub in top-level array', () => {
        const data = [
            {'@type': 'Recipe', '@id': '#recipe-stub'},
            {'@type': ['Recipe'], 'name': 'Sourdough Bread', 'recipeIngredient': ['500 g flour']}
        ];
        const recipe = extractFromJsonLd(data);
        assert.ok(recipe);
        assert.equal(recipe.title, 'Sourdough Bread');
        assert.equal(recipe.ingredients.length, 1);
    });

    test('supports @graph, single-object JSON-LD, attributes before type, and single-quoted type', () => {
        const graphHtml = `
<script id="yoast-schema" class="schema-graph" type='application/ld+json'>
{
  "@context": "https://schema.org",
  "@graph": [
    null,
    {"@type": "Organization", "name": "Test Kitchen"},
    {
      "@type": "Recipe",
      "name": "Garlic Noodles",
      "recipeIngredient": ["250 g noodles"],
      "recipeInstructions": ["Boil noodles and toss with garlic butter."]
    }
  ]
}
</script>`;
        const graphRecipe = scrapeRecipeFromHtml(graphHtml, 'https://example.com/garlic-noodles');
        assert.ok(graphRecipe);
        assert.equal(graphRecipe.title, 'Garlic Noodles');
        assert.deepEqual(Array.from(graphRecipe.steps), ['Boil noodles and toss with garlic butter.']);

        const singleHtml = `
<SCRIPT data-schema="1" TYPE="application/ld+json" defer>
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Berry Smoothie",
  "recipeIngredient": ["200 ml milk"],
  "recipeInstructions": "Blend until smooth."
}
</SCRIPT>`;
        const singleRecipe = scrapeRecipeFromHtml(singleHtml, 'https://example.com/smoothie');
        assert.ok(singleRecipe);
        assert.equal(singleRecipe.title, 'Berry Smoothie');
        assert.deepEqual(Array.from(singleRecipe.steps), ['Blend until smooth.']);
    });

    test('handles non-recipe arrays, primitives, null entries, and malformed JSON-LD without throwing', () => {
        assert.equal(extractFromJsonLd(null), null);
        assert.equal(extractFromJsonLd(undefined), null);
        assert.equal(extractFromJsonLd('Recipe'), null);
        assert.equal(extractFromJsonLd(42), null);
        assert.equal(extractFromJsonLd(true), null);
        assert.equal(extractFromJsonLd([null, 123, 'text', {'@type': 'WebPage', name: 'Home'}]), null);

        const malformedThenValidHtml = `
<script type="application/ld+json">{ invalid json </script>
<script type="application/ld+json">null</script>
<script type="application/ld+json">[null, "str", 123, {"@type": "BreadcrumbList"}]</script>
<script data-id="valid" type='application/ld+json'>[{"@type": "Recipe", "name": "Recovered Soup"}]</script>`;
        const recovered = scrapeRecipeFromHtml(malformedThenValidHtml, 'https://example.com/soup');
        assert.ok(recovered);
        assert.equal(recovered.title, 'Recovered Soup');

        const malformedFallbackToOgHtml = `
<head>
  <meta property="og:title" content="Fallback Pancake">
  <meta property="og:description" content="Fluffy pancakes">
  <meta property="og:image" content="/images/pancake.jpg">
  <script type="application/ld+json">{ broken </script>
  <script type="application/ld+json">[{"@type": "Organization", "name": "No Recipe"}]</script>
</head>`;
        const fallback = scrapeRecipeFromHtml(malformedFallbackToOgHtml, 'https://example.com/breakfast/pancake');
        assert.ok(fallback);
        assert.equal(fallback.title, 'Fallback Pancake');
        assert.equal(fallback.description, 'Fluffy pancakes');
        assert.equal(fallback.image, 'https://example.com/images/pancake.jpg');

        assert.equal(
            scrapeRecipeFromHtml('<script type="application/ld+json">[null, {"@type":"WebSite"}]</script>', 'https://example.com/empty'),
            null
        );
    });

    test('resolves relative image URLs in JSON-LD and OG tags against the page URL', () => {
        const cases = [
            {
                raw: '/uploads/pasta.jpg',
                base: 'https://recipes.example.com/italian/pasta/',
                expected: 'https://recipes.example.com/uploads/pasta.jpg',
            },
            {
                raw: 'photos/hero.webp',
                base: 'https://recipes.example.com/italian/pasta/',
                expected: 'https://recipes.example.com/italian/pasta/photos/hero.webp',
            },
            {
                raw: '//cdn.example.com/dish.png',
                base: 'https://recipes.example.com/dish',
                expected: 'https://cdn.example.com/dish.png',
            },
            {
                raw: {'@type': 'ImageObject', url: '../media/cover.jpg'},
                base: 'https://recipes.example.com/posts/2026/cake',
                expected: 'https://recipes.example.com/posts/media/cover.jpg',
            },
        ];

        for (const {raw, base, expected} of cases) {
            const html = `<script type="application/ld+json">${JSON.stringify([
                {'@type': 'Recipe', name: 'Test Recipe', image: raw}
            ])}</script>`;
            const recipe = scrapeRecipeFromHtml(html, base);
            assert.ok(recipe);
            assert.equal(recipe.image, expected);
        }

        const ogHtml = `<head>
            <meta property="og:title" content="OG Relative Image">
            <meta property="og:image" content="img/taco.jpg?w=800&amp;h=600">
        </head>`;
        const ogRecipe = scrapeRecipeFromHtml(ogHtml, 'https://recipes.example.com/mexican/tacos');
        assert.ok(ogRecipe);
        assert.equal(ogRecipe.image, 'https://recipes.example.com/mexican/img/taco.jpg?w=800&h=600');
    });
});

describe('recipe create page handleImport image proxying', () => {
    const baseRecipe = {
        title: 'Imported Curry',
        description: 'Rich curry',
        image: null,
        cookTime: 30,
        servings: 4,
        difficulty: null,
        ingredients: [],
        steps: [],
        tags: [],
        sourceUrl: 'https://recipes.example.com/curry',
    };

    test('proxies http(s) recipe images through POST /api/recipes/image and names webp files properly', async () => {
        const calls = [];
        const {pictureInput, events, queriedSelectors} = await runHandleImport(
            {...baseRecipe, image: 'https://cdn.example.com/curry.jpg'},
            async (url, init) => {
                calls.push({url, init});
                return {
                    ok: true,
                    blob: async () => new Blob([new Uint8Array([1, 2, 3])], {type: 'image/webp'}),
                };
            }
        );

        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, '/api/recipes/image');
        assert.equal(calls[0].init.method, 'POST');
        assert.deepEqual({...calls[0].init.headers}, {'Content-Type': 'application/json'});
        assert.deepEqual(JSON.parse(calls[0].init.body), {url: 'https://cdn.example.com/curry.jpg'});
        assert.equal(pictureInput.files?.length, 1);
        assert.equal(pictureInput.files[0].name, 'imported-image.webp');
        assert.equal(pictureInput.files[0].type, 'image/webp');
        assert.equal(events.length, 1);
        assert.equal(events[0].type, 'change');
        assert.ok(queriedSelectors.includes('#picture'));
    });

    test('fetches blob: cover URLs directly without hitting /api/recipes/image', async () => {
        const calls = [];
        const {pictureInput, events} = await runHandleImport(
            {...baseRecipe, image: 'blob:https://cookify.example/abc-123'},
            async (url, init) => {
                calls.push({url, init});
                return {
                    ok: true,
                    blob: async () => new Blob([new Uint8Array([4, 5, 6])], {type: 'image/jpeg'}),
                };
            }
        );

        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, 'blob:https://cookify.example/abc-123');
        assert.equal(calls[0].init, undefined);
        assert.equal(pictureInput.files?.length, 1);
        assert.equal(pictureInput.files[0].name, 'imported-image.jpg');
        assert.equal(pictureInput.files[0].type, 'image/jpeg');
        assert.equal(events.length, 1);
    });

    test('skips attaching a file when /api/recipes/image returns a non-OK error response', async () => {
        const calls = [];
        const {pictureInput, events} = await runHandleImport(
            {...baseRecipe, image: 'http://cdn.example.com/broken.jpg'},
            async (url, init) => {
                calls.push({url, init});
                return {
                    ok: false,
                    status: 400,
                    blob: async () => new Blob([JSON.stringify({error: 'Could not download image'})], {type: 'application/json'}),
                };
            }
        );

        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, '/api/recipes/image');
        assert.equal(pictureInput.files, null);
        assert.equal(events.length, 0);
    });
});
