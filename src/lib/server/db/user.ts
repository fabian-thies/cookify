import {db} from "$lib/server/db/index";
import {eq} from "drizzle-orm";
import {user} from "$lib/server/db/schema";

export async function saveProfile(userId: string, username: string, email: string, avatar: string) {
    return db.update(user)
        .set({username, email, avatar})
        .where(eq(user.id, userId));
}