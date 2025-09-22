import {getDb} from "$lib/server/db/index";
import {eq} from "drizzle-orm";
import {user} from "$lib/server/db/schema";
import type {UserLanguage} from "$lib/types/user";

export async function saveProfile(userId: string, username: string, email: string, avatar: string, language: UserLanguage) {
    const db = getDb();
    return db.update(user)
        .set({username, email, avatar, language})
        .where(eq(user.id, userId));
}

export async function updatePassword(userId: string, passwordHash: string) {
    const db = getDb();
    return db.update(user)
        .set({passwordHash})
        .where(eq(user.id, userId));
}