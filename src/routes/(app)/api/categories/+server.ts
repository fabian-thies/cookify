import {json} from "@sveltejs/kit";
import {db} from "$lib/server/db";

export async function GET() {
    try {
        const categories = await db.query.category.findMany();

        if (categories.length === 0) {
            return json({
                success: false,
                message: 'No categories found'
            });
        }

        return json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
}