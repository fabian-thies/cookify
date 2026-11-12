// Shopping list categories are shared by the server (persisted with each item) and the UI (grouping).
export const SHOPPING_CATEGORIES = [
    'produce',
    'meat_fish',
    'dairy_eggs',
    'bakery',
    'pantry',
    'frozen',
    'drinks',
    'other',
] as const;

export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number];

// Keywords are normalized with `normalizeIngredientName`, so umlauts and casing do not matter.
const CATEGORY_KEYWORDS: Record<Exclude<ShoppingCategory, 'other'>, string[]> = {
    // Supermarket sections win over ingredient type, e.g. frozen peas or apple juice.
    frozen: [
        'tk', 'tiefkuhl', 'tiefgekuhlt', 'gefroren', 'frozen', 'eis', 'eiscreme', 'eiswurfel', 'pommes'
    ],
    drinks: [
        'saft', 'juice', 'wasser', 'water', 'wein', 'wine', 'bier', 'beer', 'cola', 'limonade',
        'lemonade', 'kaffee', 'coffee', 'tee', 'tea', 'sirup', 'syrup', 'smoothie', 'prosecco',
        'sekt', 'likor', 'liqueur', 'rum', 'vodka', 'whisky', 'energy', 'mineralwasser',
        'gruntee', 'schwarztee', 'krautertee'
    ],
    meat_fish: [
        'fleisch', 'huhn', 'huhnchen', 'hahnchen', 'chicken', 'rind', 'beef', 'schwein', 'pork',
        'lamm', 'lamb', 'kalb', 'veal', 'pute', 'turkey', 'hack', 'hackfleisch', 'wurst', 'sausage',
        'schinken', 'ham', 'speck', 'bacon', 'fisch', 'fish', 'lachs', 'salmon', 'thunfisch', 'tuna',
        'garnele', 'garnelen', 'shrimp', 'prawn', 'muschel', 'meeresfruchte', 'forelle', 'trout',
        'kabeljau', 'cod', 'sardine', 'anchovis', 'anchovy'
    ],
    dairy_eggs: [
        'milch', 'milk', 'butter', 'buttermilch', 'joghurt', 'yogurt', 'quark', 'sahne', 'cream',
        'kase', 'cheese', 'ei', 'eier', 'egg', 'eggs', 'mozzarella', 'parmesan', 'feta', 'mascarpone',
        'frischkase', 'schmand', 'skyr', 'creme fraiche', 'sahnequark'
    ],
    bakery: [
        'brot', 'brotchen', 'bread', 'baguette', 'toast', 'semmel', 'croissant', 'bagel', 'brioche',
        'focaccia', 'pita', 'tortilla', 'wrap', 'kuchen', 'cake', 'kekse', 'cookie', 'biscuit',
        'zwieback', 'knackebrot', 'brezel', 'pretzel'
    ],
    produce: [
        'obst', 'gemuse', 'apfel', 'apple', 'banane', 'banana', 'tomate', 'tomaten', 'tomato',
        'zwiebel', 'onion', 'knoblauch', 'garlic', 'kartoffel', 'potato', 'karotte', 'karotten',
        'carrot', 'mohre', 'mohren', 'gurke', 'cucumber', 'salat', 'lettuce', 'spinat', 'spinach',
        'paprika', 'zucchini', 'aubergine', 'eggplant', 'brokkoli', 'broccoli', 'blumenkohl',
        'cauliflower', 'kohl', 'kraut', 'cabbage', 'pilz', 'pilze', 'champignon', 'mushroom',
        'beere', 'beeren', 'berry', 'erdbeere', 'strawberry', 'himbeere', 'raspberry', 'blaubeere',
        'blueberry', 'heidelbeere', 'preiselbeere', 'cranberry', 'johannisbeere', 'currant',
        'zitrone', 'lemon', 'limette', 'lime', 'orange', 'birne', 'pear', 'traube', 'trauben',
        'grape', 'pflaume', 'plum', 'pfirsich', 'peach', 'nektarine', 'nectarine', 'aprikose',
        'apricot', 'kirsche', 'cherry', 'kiwi', 'mango', 'avocado', 'ingwer', 'ginger',
        'petersilie', 'parsley', 'basilikum', 'basil', 'koriander', 'cilantro', 'dill', 'minze',
        'mint', 'rosmarin', 'rosemary', 'thymian', 'thyme', 'sellerie', 'celery', 'lauch', 'leek',
        'porree', 'spargel', 'asparagus', 'kurbis', 'pumpkin', 'susskartoffel', 'sweet potato',
        'radieschen', 'radish', 'rote beete', 'beet', 'fenchel', 'fennel', 'artischocke', 'artichoke',
        'olive', 'oliven', 'dattel', 'datteln', 'feige', 'fig', 'granatapfel', 'pomegranate',
        'melone', 'melon', 'ananas', 'pineapple', 'rucola', 'arugula', 'feldsalat', 'endivie',
        'chicoree', 'mangold', 'chard', 'kohlrabi', 'steckrube', 'pastinake', 'schalotte',
        'fruhlingszwiebel', 'schnittlauch', 'chive', 'estragon', 'tarragon', 'majoran', 'marjoram',
        'krauter'
    ],
    pantry: [
        'reis', 'rice', 'nudel', 'nudeln', 'pasta', 'spaghetti', 'penne', 'fusilli', 'makkaroni',
        'macaroni', 'couscous', 'bulgur', 'quinoa', 'mehl', 'flour', 'zucker', 'sugar', 'salz',
        'salt', 'pfeffer', 'pepper', 'ol', 'oil', 'essig', 'vinegar', 'sauce', 'sosse', 'ketchup',
        'mayonnaise', 'mayo', 'senf', 'mustard', 'honig', 'honey', 'marmelade', 'jam', 'schokolade',
        'chocolate', 'kakao', 'cocoa', 'nuss', 'nusse', 'nut', 'nuts', 'mandel', 'mandeln',
        'almond', 'walnuss', 'walnut', 'haselnuss', 'hazelnut', 'sesam', 'sesame', 'hefe', 'yeast',
        'backpulver', 'natron', 'zimt', 'cinnamon', 'curry', 'paprikapulver', 'lorbeer', 'vanille',
        'vanilla', 'konserve', 'konserven', 'canned', 'dose', 'bruhe', 'broth', 'bouillon',
        'kokosmilch', 'coconut', 'mandelmilch', 'hafermilch', 'sojamilch', 'tomatenmark', 'passata',
        'sriracha', 'sojasauce', 'sojasosse', 'worcester', 'tabasco', 'chili', 'kreuzkummel',
        'cumin', 'kurkuma', 'turmeric', 'muskat', 'nutmeg', 'ingwerpulver', 'gewurz', 'gewurze',
        'suppe', 'soup', 'salsa', 'pesto', 'hummus', 'tahini', 'erdnussbutter', 'haferflocken',
        'oats', 'musli', 'granola', 'cornflakes', 'pudding', 'gelatine', 'starke', 'starch',
        'speisestarke', 'puderzucker', 'vanillezucker', 'sweetener', 'agave', 'ahornsirup',
        'maple syrup', 'schokotropfen', 'kichererbse', 'kichererbsen', 'chickpeas', 'kidneybohnen',
        'kidney beans', 'linse', 'linsen', 'lentil', 'erbse', 'erbsen', 'pea', 'peas', 'bohne',
        'bohnen', 'bean', 'beans', 'mais', 'corn', 'olivenol', 'rapsol', 'sonnenblumenol',
        'kokosol', 'erdnussol', 'bratol'
    ],
};

function normalizeIngredientName(name: string): string {
    return name
        .toLowerCase()
        .replace(/ß/g, 'ss')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

const NORMALIZED_KEYWORDS = Object.fromEntries(
    Object.entries(CATEGORY_KEYWORDS).map(([category, keywords]) => [
        category,
        keywords.map(normalizeIngredientName),
    ])
) as Record<Exclude<ShoppingCategory, 'other'>, string[]>;

const RULE_ORDER: Exclude<ShoppingCategory, 'other'>[] = [
    'frozen', 'drinks', 'meat_fish', 'dairy_eggs', 'bakery', 'produce', 'pantry'
];

function tokensOf(normalized: string): Set<string> {
    return new Set(normalized.split(/[^a-z0-9]+/).filter(Boolean));
}

/**
 * Categorizes an ingredient by its name. Exact word matches win over substring matches, so
 * "Paprikapulver" stays in the pantry while "Hähnchenbrust" still matches via "hahnchen".
 */
export function categorizeIngredient(name: string): ShoppingCategory {
    const normalized = normalizeIngredientName(name);
    const tokens = tokensOf(normalized);

    for (const category of RULE_ORDER) {
        if (NORMALIZED_KEYWORDS[category].some((keyword) => tokens.has(keyword))) {
            return category;
        }
    }

    for (const category of RULE_ORDER) {
        if (NORMALIZED_KEYWORDS[category].some(
            (keyword) => keyword.length >= 4 && normalized.includes(keyword)
        )) {
            return category;
        }
    }

    return 'other';
}
