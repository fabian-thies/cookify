import {db} from "$lib/server/db";
import {type Category, category, ingredients, type Recipe, recipe, recipeCategory} from "$lib/server/db/schema";
import {eq} from "drizzle-orm";
import type {RecipeWithIngredients} from "$lib/types/recipes";

export async function getRecipe(id: number): Promise<RecipeWithIngredients> {
    const result = await db
        .select({
            recipe: recipe,
            ingredient: ingredients
        })
        .from(recipe)
        .innerJoin(ingredients, eq(recipe.id, ingredients.recipeId))
        .where(eq(recipe.id, id));

    if (result.length === 0) {
        throw new Error('Recipe not found');
    }

    const recipeData = result[0].recipe;

    const ingredientsList = result
        .map(row => row.ingredient);

    return {
        ...recipeData,
        ingredients: ingredientsList
    };
}


export async function getRecipes(searchQuery?: string, limit: number = 20, page: number = 0): Promise<Recipe[]> {
    const offset = (page - 1) * limit;

    return [];
}

export async function getRecipeCount(): Promise<number> {
    return db.$count(recipe);
}

export async function getCategories(recipeId: number): Promise<Category[]> {
    return db
        .select({
            id: category.id,
            name: category.name
        })
        .from(category);
}

export async function getCategoriesForRecipe(recipeId: number): Promise<Category[]> {
    return db
        .select({
            id: category.id,
            name: category.name
        })
        .from(category)
        .innerJoin(recipeCategory, eq(category.id, recipeCategory.categoryId))
        .where(eq(recipeCategory.id, recipeId));
}

export async function createRecipe(recipe: Recipe): Promise<Recipe> {
    return recipe;
}

export async function updateRecipe(recipeData: Recipe): Promise<Recipe> {
    const result = await db
        .update(recipe)
        .set(recipeData)
        .where(eq(recipe.id, recipeData.id))
        .returning();

    return result[0];
}


export async function deleteRecipe(id: number): Promise<void> {
    db.delete(recipe).where(eq(recipe.id, id));

    return;
}