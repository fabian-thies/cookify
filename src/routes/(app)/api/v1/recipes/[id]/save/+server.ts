import type {RequestHandler} from "@sveltejs/kit";
import {db} from "$lib/server/db";
import {saved_recipes} from "$lib/server/db/schema";
import {and, eq} from 'drizzle-orm';

export const POST: RequestHandler = async ({locals, params}) => {
    const user = locals.user;
    if (!user) {
        return new Response("Unauthorized", {status: 401});
    }

    if (!params.id || isNaN(parseInt(params.id))) {
        return new Response("Recipe ID is required", {status: 400});
    }

    const saveExists = await db.select().from(saved_recipes).where(and(eq(saved_recipes.userId, user.id), eq(saved_recipes.recipeId, params.id)));
    let saved;

    if(saveExists.length == 0) {
        saved = await db.insert(saved_recipes).values({
            userId: user.id,
            recipeId: parseInt(params.id)
        });
    } else {
        saved = await db.delete(saved_recipes).where(and(eq(saved_recipes.userId, user.id), eq(saved_recipes.recipeId, params.id)));
    }

    return new Response(JSON.stringify(saved), {
        headers: {"Content-Type": "application/json"}
    });
};