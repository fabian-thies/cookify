import {getDb} from '$lib/server/db';
import {
    collectionToRecipe,
    collections,
    ingredients,
    steps,
    tips,
    user
} from '$lib/server/db/schema';
import {getRecipesByUserId} from '$lib/server/db/recipe';
import {eq, inArray} from 'drizzle-orm';
import type {UserLanguage} from '$lib/types/languages';

export type CookbookIngredient = {
    name: string;
    quantity: number;
    unit: string;
};

export type CookbookRecipe = {
    id: number;
    title: string;
    description: string;
    image: string;
    cookingTime: number;
    servings: number;
    visibility: 'public' | 'private';
    createdAt: Date;
    difficulty: string;
    tags: string[];
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
    ingredients: CookbookIngredient[];
    steps: string[];
    tips: string[];
};

export type CookbookCollection = {
    title: string;
    recipeIds: number[];
};

export type CookbookData = {
    exportedAt: Date;
    user: {
        username: string;
        language: UserLanguage;
    };
    recipes: CookbookRecipe[];
    collections: CookbookCollection[];
};

function groupByRecipe<T extends {recipeId: number}>(rows: T[]): Map<number, T[]> {
    const grouped = new Map<number, T[]>();
    for (const row of rows) {
        const list = grouped.get(row.recipeId) ?? [];
        list.push(row);
        grouped.set(row.recipeId, list);
    }
    return grouped;
}

export async function getCookbookData(userId: string): Promise<CookbookData> {
    const db = getDb();
    const [profile] = await db
        .select({username: user.username, language: user.language})
        .from(user)
        .where(eq(user.id, userId));

    if (!profile) {
        throw new Error('User not found');
    }

    const recipeRows = await getRecipesByUserId(userId, true);
    const recipeIds = recipeRows.map((recipe) => recipe.id);

    const [ingredientRows, stepRows, tipRows, collectionRows] = await Promise.all([
        recipeIds.length
            ? db.select().from(ingredients).where(inArray(ingredients.recipeId, recipeIds)).orderBy(ingredients.id)
            : Promise.resolve([]),
        recipeIds.length
            ? db.select().from(steps).where(inArray(steps.recipeId, recipeIds)).orderBy(steps.number)
            : Promise.resolve([]),
        recipeIds.length
            ? db.select().from(tips).where(inArray(tips.recipeId, recipeIds)).orderBy(tips.id)
            : Promise.resolve([]),
        db.select({id: collections.id, title: collections.title})
            .from(collections)
            .where(eq(collections.userId, userId))
            .orderBy(collections.title)
    ]);

    const collectionIds = collectionRows.map((collection) => collection.id);
    const collectionRecipeRows = collectionIds.length
        ? await db.select()
            .from(collectionToRecipe)
            .where(inArray(collectionToRecipe.collectionId, collectionIds))
            .orderBy(collectionToRecipe.id)
        : [];

    const ingredientsByRecipe = groupByRecipe(ingredientRows);
    const stepsByRecipe = groupByRecipe(stepRows);
    const tipsByRecipe = groupByRecipe(tipRows);

    const collectionRecipes = new Map<number, number[]>();
    for (const link of collectionRecipeRows) {
        const list = collectionRecipes.get(link.collectionId) ?? [];
        list.push(link.recipeId);
        collectionRecipes.set(link.collectionId, list);
    }

    const cookbookRecipes: CookbookRecipe[] = recipeRows
        .map((recipe) => ({
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            image: recipe.image,
            cookingTime: recipe.cookingTime,
            servings: recipe.servings,
            visibility: recipe.visibility,
            createdAt: recipe.createdAt,
            difficulty: recipe.difficulty,
            tags: recipe.tags ?? [],
            calories: recipe.calories,
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat,
            fiber: recipe.fiber,
            ingredients: (ingredientsByRecipe.get(recipe.id) ?? []).map((ingredient) => ({
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit
            })),
            steps: (stepsByRecipe.get(recipe.id) ?? []).map((step) => step.step),
            tips: (tipsByRecipe.get(recipe.id) ?? []).map((tip) => tip.tip)
        }))
        .sort((a, b) => a.title.localeCompare(b.title));

    return {
        exportedAt: new Date(),
        user: {username: profile.username, language: profile.language},
        recipes: cookbookRecipes,
        collections: collectionRows.map((collection) => ({
            title: collection.title,
            recipeIds: collectionRecipes.get(collection.id) ?? []
        }))
    };
}
