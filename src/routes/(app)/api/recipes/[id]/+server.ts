import { json } from "@sveltejs/kit";
import {db} from "$lib/server/db";

export async function GET() {
    try {
        const recipes = await db.query.recipe.findMany({
            where: (recipes, {eq: equals}) => equals(recipes.status, 'published'),
            with: {
                ingredients: true,
                instructions: true,
                user: {
                    columns: {
                        id: true,
                        username: true
                    }
                },
                recipeCategories: {
                    with: {
                        category: true
                    }
                }
            }
        });

        if(recipes.length === 0) {
            return json({
                success: false,
                message: 'No recipes found'
            });
        }

        return json({
            success: true,
            recipes
        });
    } catch (error) {
        console.error('Error fetching recipes:', error);
        return json({
            success: false,
            message: 'Failed to fetch recipes'
        });
    }
}