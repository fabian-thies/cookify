import {siteSettings} from "$lib/server/db/schema";
import {getDb} from "$lib/server/db/index";

export async function updateAllowRegistrations(value: boolean) {
    const db = getDb();

    return db.insert(siteSettings)
        .values({key: 'allowRegistrations', value: value.toString()})
        .onConflictDoUpdate({target: siteSettings.key, set: {value: value.toString()}}).returning();
}