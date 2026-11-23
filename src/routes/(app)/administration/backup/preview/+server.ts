import { error, json } from '@sveltejs/kit';
import { readBackup } from '../archive';

export const POST = async ({ locals, request }) => {
    if (!locals.user?.administrator) {
        throw error(401, 'Unauthorized');
    }

    const {data, uploads} = await readBackup(request);

    return json({
        users: data.users?.length ?? 0,
        recipes: data.recipes?.length ?? 0,
        collections: data.collections?.length ?? 0,
        ingredients: data.ingredients?.length ?? 0,
        steps: data.steps?.length ?? 0,
        favorites: data.favorite?.length ?? 0,
        ratings: data.recipeRating?.length ?? 0,
        tips: data.tips?.length ?? 0,
        tags: data.tags?.length ?? 0,
        difficulties: data.difficulty?.length ?? 0,
        settings: data.siteSettings?.length ?? 0,
        images: uploads.length,
    });
};
