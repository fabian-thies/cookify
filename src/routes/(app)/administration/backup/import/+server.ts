import { error, json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_IMAGE_EXTENSIONS = new Set([
    '.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp'
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

function validateBackup(zip: AdmZip): Record<string, Record<string, unknown>[]> {
    const dataEntry = zip.getEntry('data.json');
    if (!dataEntry) {
        throw new Error('Invalid backup: missing data.json');
    }

    let raw: Record<string, unknown[]>;
    try {
        raw = JSON.parse(dataEntry.getData().toString('utf-8'));
    } catch {
        throw new Error('Invalid backup: data.json is not valid JSON');
    }

    const requiredTables = ['users', 'recipes', 'ingredients', 'steps'];
    for (const t of requiredTables) {
        if (!Array.isArray(raw[t])) {
            throw new Error(`Invalid backup: missing or invalid table "${t}"`);
        }
    }

    for (const entry of zip.getEntries()) {
        if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
            const ext = path.extname(entry.entryName).toLowerCase();
            if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
                throw new Error(`Invalid backup: disallowed file type "${ext}"`);
            }
            const normalized = path.normalize(entry.entryName);
            if (!normalized.startsWith('uploads/')) {
                throw new Error('Invalid backup: path traversal detected');
            }
        }
    }

    return raw as Record<string, Record<string, unknown>[]>;
}

function sanitizeDates(data: Record<string, Record<string, unknown>[]>) {
    const timestampFields: Record<string, string[]> = {
        siteSettings: ['updatedAt'],
        recipes: ['createdAt', 'updatedAt'],
        recipeRating: ['createdAt', 'updatedAt'],
        passkey: ['createdAt'],
        shoppingListItems: ['createdAt', 'updatedAt'],
    };

    for (const [tableName, fields] of Object.entries(timestampFields)) {
        const rows = data[tableName];
        if (!rows) continue;
        for (const row of rows) {
            for (const field of fields) {
                const val = row[field];
                if (typeof val === 'string') {
                    row[field] = new Date(val);
                }
            }
        }
    }
}

function restoreUploads(zip: AdmZip) {
    const uploadsDir = path.resolve(process.cwd(), 'uploads');

    if (fs.existsSync(uploadsDir)) {
        fs.rmSync(uploadsDir, { recursive: true, force: true });
    }

    const entries = zip.getEntries().filter((e) => e.entryName.startsWith('uploads/'));
    for (const entry of entries) {
        if (entry.isDirectory) continue;

        const relativePath = entry.entryName.replace(/^uploads\//, '');
        const destPath = path.join(uploadsDir, relativePath);
        const destDir = path.dirname(destPath);

        fs.mkdirSync(destDir, { recursive: true });
        fs.writeFileSync(destPath, entry.getData());
    }
}

export const POST = async ({ locals, request }) => {
    if (!locals.user?.administrator) {
        throw error(401, 'Unauthorized');
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
        throw error(400, 'No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
        throw error(400, 'File too large');
    }

    if (!file.name.endsWith('.zip')) {
        throw error(400, 'Only .zip files are accepted');
    }

    let zip: AdmZip;
    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        zip = new AdmZip(buffer);
    } catch {
        throw error(400, 'Invalid zip file');
    }

    let data: Record<string, Record<string, unknown>[]>;
    try {
        data = validateBackup(zip);
    } catch (e) {
        throw error(400, (e as Error).message);
    }

    const db = getDb();

    // Convert ISO date strings from JSON back to Date objects
    sanitizeDates(data);

    try {
        await db.transaction(async (tx) => {
            // Clear in reverse dependency order (children first)
            await tx.delete(table.passkey);
            await tx.delete(table.recipeRating);
            await tx.delete(table.favorite);
            await tx.delete(table.tips);
            await tx.delete(table.tags);
            await tx.delete(table.steps);
            await tx.delete(table.ingredients);
            await tx.delete(table.difficultyToRecipe);
            await tx.delete(table.collectionToRecipe);
            await tx.delete(table.collections);
            await tx.delete(table.difficulty);
            await tx.delete(table.mealPlan);
            await tx.delete(table.shoppingListItems);
            await tx.delete(table.cookHistory);
            await tx.delete(table.session);
            await tx.delete(table.recipes);
            await tx.delete(table.siteSettings);
            await tx.delete(table.user);

            // Insert in dependency order (parents first)
            if (data.users?.length) {
                await tx.insert(table.user).values(data.users as typeof table.user.$inferInsert[]);
            }
            if (data.passkey?.length) {
                await tx.insert(table.passkey).values(data.passkey as typeof table.passkey.$inferInsert[]);
            }
            if (data.siteSettings?.length) {
                await tx.insert(table.siteSettings).values(data.siteSettings as typeof table.siteSettings.$inferInsert[]);
            }
            if (data.recipes?.length) {
                await tx.insert(table.recipes).values(data.recipes as typeof table.recipes.$inferInsert[]);
            }
            if (data.cookHistory?.length) {
                await tx.insert(table.cookHistory).values(data.cookHistory as typeof table.cookHistory.$inferInsert[]);
            }
            if (data.difficulty?.length) {
                await tx.insert(table.difficulty).values(data.difficulty as typeof table.difficulty.$inferInsert[]);
            }
            if (data.difficultyToRecipe?.length) {
                await tx.insert(table.difficultyToRecipe).values(data.difficultyToRecipe as typeof table.difficultyToRecipe.$inferInsert[]);
            }
            if (data.ingredients?.length) {
                await tx.insert(table.ingredients).values(data.ingredients as typeof table.ingredients.$inferInsert[]);
            }
            if (data.steps?.length) {
                await tx.insert(table.steps).values(data.steps as typeof table.steps.$inferInsert[]);
            }
            if (data.tags?.length) {
                await tx.insert(table.tags).values(data.tags as typeof table.tags.$inferInsert[]);
            }
            if (data.tips?.length) {
                await tx.insert(table.tips).values(data.tips as typeof table.tips.$inferInsert[]);
            }
            if (data.favorite?.length) {
                await tx.insert(table.favorite).values(data.favorite as typeof table.favorite.$inferInsert[]);
            }
            if (data.recipeRating?.length) {
                await tx.insert(table.recipeRating).values(data.recipeRating as typeof table.recipeRating.$inferInsert[]);
            }
            if (data.collections?.length) {
                await tx.insert(table.collections).values(data.collections as typeof table.collections.$inferInsert[]);
            }
            if (data.collectionToRecipe?.length) {
                await tx.insert(table.collectionToRecipe).values(data.collectionToRecipe as typeof table.collectionToRecipe.$inferInsert[]);
            }
            if (data.mealPlan?.length) {
                await tx.insert(table.mealPlan).values(data.mealPlan as typeof table.mealPlan.$inferInsert[]);
            }
            if (data.shoppingListItems?.length) {
                await tx.insert(table.shoppingListItems).values(data.shoppingListItems as typeof table.shoppingListItems.$inferInsert[]);
            }
        });

        // TODO
        // Resynchronize serial sequences to prevent duplicate key errors on future inserts
        const serialTables = [
            'site_settings', 'recipes', 'difficulty', 'ingredients', 'steps',
            'favorite', 'tags', 'tips', 'recipe_rating', 'collections', 'collection_to_recipe', 'meal_plan', 'shopping_list_items', 'cook_history'
        ];
        for (const tableName of serialTables) {
            await db.execute(sql.raw(
                `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), ` +
                `COALESCE((SELECT MAX(id) FROM "${tableName}"), 0) + 1, false)`
            ));
        }

        // Restore uploads after successful DB import
        restoreUploads(zip);

        return json({ success: true });
    } catch (e) {
        console.error('Import failed:', e);
        throw error(500, 'Failed to import backup');
    }
};
