import {json, type RequestEvent} from "@sveltejs/kit";
import {db} from "$lib/server/db";
import {ingredients, recipe} from "$lib/server/db/schema";
import {and, eq} from "drizzle-orm";

export async function GET(event: RequestEvent) {
    try {
        if (!event.params.id) {
            return json({
                success: false,
                message: 'Recipe ID is required'
            }, {status: 400});
        }

        const recipeId = parseInt(event.params.id);

        const recipeData = await db.select().from(recipe)
            .where(and(eq(recipe.status, 'published'), eq(recipe.id, recipeId)))
            .limit(1);

        if (!recipeData || recipeData.length === 0) {
            return json({
                success: false,
                message: 'No recipe found'
            });
        }

        const ingredientsData = await db.select().from(ingredients)
            .where(eq(ingredients.recipeId, recipeId));

        return json({
            success: true,
            recipe: recipeData[0],
            ingredients: ingredientsData
        });

    } catch (error) {
        console.error('Error fetching recipe:', error);
        return json({
            success: false,
            message: 'Failed to fetch recipe'
        });
    }
}