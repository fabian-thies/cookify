import {db} from "$lib/server/db";
import {userTable} from "$lib/server/db/schema";
import bcrypt from "bcrypt";
import {eq} from "drizzle-orm";

export async function createUser(username: string, email: string, password: string): Promise<number | null> {
    const existingUser = await db
        .select({id: userTable.id})
        .from(userTable)
        .where(eq(userTable.email, email));

    if (existingUser.length >= 1) {
        throw new Error("Ein Nutzer mit dieser E-Mail existiert bereits.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db
        .insert(userTable)
        .values({
            email,
            username,
            passwordHash,
        })
        .returning({id: userTable.id});

    return newUser.id;
}

export async function getUserByEmail(email: string): Promise<{
    id: number;
    email: string;
    username: string;
    passwordHash: string
} | null> {
    const [user] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, email));

    return user;
}