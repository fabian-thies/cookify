import {json, type RequestEvent} from "@sveltejs/kit";
import {db} from "$lib/server/db";
import {ingredient, recipe} from "$lib/server/db/schema";
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

        const recipes = await db.select().from(recipe).where(and(eq(recipe.status, 'published'), eq(recipe.id, recipeId)))
            .innerJoin(ingredient, eq(recipe.id, ingredient.recipeId));

        if (!recipes || recipes.length === 0) {
            return json({
                success: false,
                message: 'No recipe found'
            });
        }

        return json({
            success: true,
            recipes
        });
    } catch (error) {
        console.error('Error fetching recipe:', error);
        return json({
            success: false,
            message: 'Failed to fetch recipe'
        });
    }
}