import {json, type RequestHandler} from '@sveltejs/kit';
import {db} from '$lib/server/db';
import {and, asc, count, desc, eq, ilike, like} from 'drizzle-orm';
import {ingredient, recipe} from "$lib/server/db/schema";
import {saveFile} from "$lib/server/storage";

export const GET: RequestHandler = async ({url}) => {
    try {
        const searchQuery = url.searchParams.get('search') || '';
        const categoryId = url.searchParams.get('category') ? parseInt(url.searchParams.get('category') || '0') : undefined;
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const page = parseInt(url.searchParams.get('page') || '1');
        const offset = (page - 1) * limit; // Calculate offset for pagination
        const sortBy = url.searchParams.get('sortBy') || 'createdAt';
        const sortOrder = url.searchParams.get('order') === 'asc' ? asc : desc;

        let whereConditions = [eq(recipe.status, 'published')];

        if (searchQuery) {
            whereConditions.push(ilike(recipe.title, `%${searchQuery}%`));
        }

        let whereClause = whereConditions.length === 1
            ? whereConditions[0]
            : and(...whereConditions);

        const [recipesCount, recipes] = await Promise.all([
            db.select({recipeCount: count()}).from(recipe).where(whereClause),
            db.select().from(recipe).where(whereClause).limit(limit).offset(offset)
        ]);

        const hasNextPage = recipesCount[0].recipeCount > page * limit;

        return json({
            success: true,
            recipes,
            pagination: {
                page,
                limit,
                hasNextPage
            }
        });
    } catch (error) {
        console.error('Error fetching recipes:', error);

        return json({
            success: false,
            message: 'Recipes could not be fetched'
        }, {status: 500});
    }
}

export const PUT: RequestHandler = async ({request}) => {
    try {
        const formData = await request.formData();
        const recipeName = formData.get('recipeName')?.toString().trim();
        const servingsRaw = formData.get('servings')?.toString().trim();
        const cookingTimeRaw = formData.get('cookingTime')?.toString().trim();
        const visibility = formData.get('visibility')?.toString().trim();
        const preparationSteps = formData.get('preparationSteps')?.toString().trim();
        const userId = formData.get('userId')?.toString().trim();
        const imageFile = formData.get('imageFile') as File | null;
        const ingredientsRaw = formData.get('ingredients')?.toString() ?? '[]';

        let ingredients: { name: string; quantity: string }[];
        try {
            ingredients = JSON.parse(ingredientsRaw);
        } catch {
            return json({success: false, message: 'Invalid ingredients format'}, {status: 400});
        }

        if (
            !recipeName ||
            !preparationSteps ||
            ingredients.length === 0 ||
            !userId ||
            !visibility ||
            !servingsRaw ||
            !cookingTimeRaw ||
            !imageFile ||
            imageFile.size === 0
        ) {
            return json({success: false, message: 'Missing required fields'}, {status: 400});
        }

        const servings = Number(servingsRaw);
        const cookingTime = Number(cookingTimeRaw);
        if (isNaN(servings) || isNaN(cookingTime)) {
            return json({success: false, message: 'Servings and cookingTime must be numbers'}, {status: 400});
        }

        const imageUrl = await saveFile(imageFile);

        await db.transaction(async (tx) => {
            const [newRecipe] = await tx
                .insert(recipe)
                .values({
                    userId,
                    title: recipeName,
                    description: preparationSteps,
                    imageUrl,
                    prepTime: null,
                    cookTime: cookingTime,
                    servings,
                    status: visibility === 'Published' ? 'published' : 'draft'
                })
                .returning();

            await Promise.all(
                ingredients.map(ing =>
                    tx.insert(ingredient).values({
                        recipeId: newRecipe.id,
                        name: ing.name,
                        quantity: ing.quantity
                    })
                )
            );
        });

        return json({success: true, message: 'Recipe created successfully'});
    } catch (error) {
        console.error('Error creating recipe:', error);
        return json({success: false, message: 'Recipe could not be created'}, {status: 500});
    }
};