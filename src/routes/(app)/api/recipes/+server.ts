import {json} from '@sveltejs/kit';
import {db} from '$lib/server/db';
import {asc, desc} from 'drizzle-orm';
import {recipe} from "$lib/server/db/schema";

// Fetch all recipes with optional search, category filter, and pagination
export async function GET({url}) {
    try {
        const searchQuery = url.searchParams.get('search') || '';
        const categoryId = url.searchParams.get('category') ? parseInt(url.searchParams.get('category') || '0') : undefined;
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const page = parseInt(url.searchParams.get('page') || '1');
        const offset = (page - 1) * limit; // Calculate offset for pagination
        const sortBy = url.searchParams.get('sortBy') || 'createdAt';
        const sortOrder = url.searchParams.get('order') === 'asc' ? asc : desc;

        let query = db.query.recipe.findMany({
            where: (recipes, {eq: equals, and, like: likeOp, inArray}) => {
                const conditions = [equals(recipes.status, 'published')];

                if (searchQuery) {
                    conditions.push(likeOp(recipes.title, `%${searchQuery}%`));
                }

                return and(...conditions);
            },
            with: {
                ingredients: true,
                instructions: true,
                user: {
                    columns: {
                        id: true,
                        username: true
                    }
                },
                recipeCategories: categoryId ? {
                    where: (recipeCategories, {eq: equals}) =>
                        equals(recipeCategories.categoryId, categoryId),
                    with: {
                        category: true
                    }
                } : {
                    with: {
                        category: true
                    }
                }
            },
            limit,
            offset,
            orderBy: (recipe, {asc: ascOp, desc: descOp}) =>
                sortOrder === asc ? ascOp(recipe[sortBy as keyof typeof recipe]) : descOp(recipe[sortBy as keyof typeof recipe])
        });

        // For pagination, we need to count the total number of recipes that match the criteria
        const totalCount = await db.query.recipe.findMany({
            where: (recipes, {eq: equals}) => equals(recipes.status, 'published'),
            columns: {
                id: true
            }
        }).then(results => results.length);

        const recipes = await query;

        return json({
            success: true,
            recipes,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
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

// Create a new recipe
export async function PUT({url}) {
    try {
        const title = url.searchParams.get('title');
        const description = url.searchParams.get('description');
        const userId = url.searchParams.get('userId');
        const imageUrl = url.searchParams.get('imageUrl');
        const prepTime = url.searchParams.get('prepTime');
        const cookTime = url.searchParams.get('cookTime');
        const servings = url.searchParams.get('servings');
        const status = url.searchParams.get('status') || 'draft'; // Default to 'draft' if not provided

        if (!title || !description || !userId || !imageUrl) {
            return json({
                success: false,
                message: 'Missing required fields'
            }, {status: 400});
        }

        await db.transaction(async (tx) => {
            await tx.insert(recipe).values({
                userId,
                title,
                description,
                imageUrl,
                prepTime: prepTime ? parseInt(prepTime) : null,
                cookTime: cookTime ? parseInt(cookTime) : null,
                servings: servings ? parseInt(servings) : null,
                status
            });
        });

        return json({
            success: true,
            message: 'Recipe created successfully'
        });
    } catch (error) {
        console.error('Error creating recipe:', error);

        return json({
            success: false,
            message: 'Recipe could not be created'
        }, {status: 500});
    }
}