import { error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { recipeColumns } from '$lib/server/db/recipe';
import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';

export const GET = async ({ locals }) => {
    if (!locals.user?.administrator) {
        throw error(401, 'Unauthorized');
    }

    const db = getDb();

    const data = {
        users: await db.select().from(table.user),
        passkey: await db.select().from(table.passkey),
        siteSettings: await db.select().from(table.siteSettings),
        recipes: await db.select(recipeColumns).from(table.recipes),
        difficulty: await db.select().from(table.difficulty),
        difficultyToRecipe: await db.select().from(table.difficultyToRecipe),
        ingredients: await db.select().from(table.ingredients),
        steps: await db.select().from(table.steps),
        favorite: await db.select().from(table.favorite),
        cookHistory: await db.select().from(table.cookHistory),
        tags: await db.select().from(table.tags),
        tips: await db.select().from(table.tips),
        recipeRating: await db.select().from(table.recipeRating),
        collections: await db.select().from(table.collections),
        collectionToRecipe: await db.select().from(table.collectionToRecipe),
    };

    const zip = new AdmZip();
    zip.addFile('data.json', Buffer.from(JSON.stringify(data)));

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsDir)) {
        const entries = fs.readdirSync(uploadsDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(uploadsDir, entry.name);
            if (entry.isDirectory()) {
                zip.addLocalFolder(fullPath, `uploads/${entry.name}`);
            } else {
                zip.addLocalFile(fullPath, 'uploads');
            }
        }
    }

    const zipBuffer = zip.toBuffer();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    return new Response(zipBuffer, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="cookify-backup-${timestamp}.zip"`,
        },
    });
};
