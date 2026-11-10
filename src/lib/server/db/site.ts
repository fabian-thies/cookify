import {siteSettings} from "$lib/server/db/schema";
import {getDb} from "$lib/server/db/index";
import {eq} from "drizzle-orm";

export async function updateAllowRegistrations(value: boolean) {
    const db = getDb();

    return db.insert(siteSettings)
        .values({key: 'allowRegistrations', value: value.toString()})
        .onConflictDoUpdate({target: siteSettings.key, set: {value: value.toString()}}).returning();
}

export async function getAllowRegistrations() {
    const db = getDb();
    const [row] = await db
        .select({value: siteSettings.value})
        .from(siteSettings)
        .where(eq(siteSettings.key, 'allowRegistrations'));

    return row ? row.value === 'true' : true;
}

export async function updateAiEnabled(value: boolean) {
    const db = getDb();

    return db.insert(siteSettings)
        .values({key: 'aiEnabled', value: value.toString()})
        .onConflictDoUpdate({target: siteSettings.key, set: {value: value.toString()}}).returning();
}

export async function getAiEnabled() {
    const db = getDb();
    const [row] = await db
        .select({value: siteSettings.value})
        .from(siteSettings)
        .where(eq(siteSettings.key, 'aiEnabled'));

    return row ? row.value === 'true' : true;
}
