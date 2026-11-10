import {and, eq} from 'drizzle-orm';
import {getDb} from '$lib/server/db/index';
import {passkey} from '$lib/server/db/schema';

export async function getPasskeysByUserId(userId: string) {
    const db = getDb();
    return db
        .select({id: passkey.id, createdAt: passkey.createdAt})
        .from(passkey)
        .where(eq(passkey.userId, userId));
}

export async function getPasskeyById(id: string) {
    const db = getDb();
    const rows = await db.select().from(passkey).where(eq(passkey.id, id)).limit(1);
    return rows[0] ?? null;
}

export async function createPasskey(values: typeof passkey.$inferInsert) {
    const db = getDb();
    return db.insert(passkey).values(values);
}

export async function updatePasskeyCounter(id: string, counter: number) {
    const db = getDb();
    return db.update(passkey).set({counter}).where(eq(passkey.id, id));
}

export async function deletePasskey(userId: string, id: string) {
    const db = getDb();
    return db.delete(passkey).where(and(eq(passkey.id, id), eq(passkey.userId, userId)));
}
