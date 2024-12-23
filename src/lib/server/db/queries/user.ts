import {sessionTable, userTable} from "$lib/server/db/schema";
import {eq} from "drizzle-orm";
import {db} from "$lib/server/db";
import bcrypt from "bcrypt";
import type {DatabaseResponse} from "$lib/types/Database";

export async function createUser(username: string, email: string, password: string): Promise<DatabaseResponse<number>> {
    const existingUser = await db
        .select({id: userTable.id})
        .from(userTable)
        .where(eq(userTable.email, email));

    if (existingUser.length >= 1) {
        return {success: false, message: "User already exists"};
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db
        .insert(userTable)
        .values({email, username, passwordHash,})
        .returning({id: userTable.id});

    return {success: true, data: newUser.id};
}

export async function createSession(userId: number): Promise<DatabaseResponse<string>> {
    const token = crypto.getRandomValues(new Uint8Array(32)).join("");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    const [newSession] = await db
        .insert(sessionTable)
        .values({
                userId: userId,
                token: token,
                expiresAt: expiresAt,
            }
        ).returning({token: sessionTable.token});

    if (!newSession) {
        return {success: false, message: "Failed to create session"};
    }

    return {success: true, data: newSession.token};
}

export async function getUserSession(userId: number): Promise<DatabaseResponse<{
    userId: number;
    token: string;
    expiresAt: Date;
} | null>> {
    const [session] = await db.select()
        .from(sessionTable)
        .where(eq(sessionTable.userId, userId));

    if (!session) {
        return {success: false, message: "Session not found"};
    }

    return {success: true, data: session};
}

export async function getUserBySessionToken(token: string): Promise<DatabaseResponse<{
    id: number;
    email: string;
    username: string;
    passwordHash: string;
}>> {
    const [session] = await db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.token, token));

    if (!session) {
        return {success: false, message: "Session not found"};
    }

    const [user] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, session.userId));

    if (!user) {
        return {success: false, message: "User not found"};
    }

    return {success: true, data: user};
}

export async function getUserByEmail(email: string): Promise<DatabaseResponse<{
    id: number;
    email: string;
    username: string;
    passwordHash: string;
}>> {
    const [user] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, email));

    if (!user) {
        return {success: false, message: "User not found"};
    }

    return {success: true, data: user};
}