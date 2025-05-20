import {json, type RequestHandler} from "@sveltejs/kit";
import {db} from "$lib/server/db";
import {saved_recipes} from "$lib/server/db/schema";
import {eq} from "drizzle-orm";

export const GET: RequestHandler = async ({locals}) => {
    const user = locals.user;
    if (!user) {
        return new Response("Unauthorized", {status: 401});
    }

    // TOOD: Implement load of given recipe IDs
    const rows = await db.select().from(saved_recipes).where(eq(saved_recipes.userId, user.id));

    return json({saved: rows})
}