import { error, json } from '@sveltejs/kit';
import AdmZip from 'adm-zip';
import path from 'node:path';

const ALLOWED_IMAGE_EXTENSIONS = new Set([
    '.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'
]);

const MAX_FILE_SIZE = 5000 * 1024 * 1024; // 5000 MB max backup size

function validateBackup(zip: AdmZip) {
    const dataEntry = zip.getEntry('data.json');
    if (!dataEntry) {
        throw new Error('Invalid backup: missing data.json');
    }

    let data: Record<string, unknown[]>;
    try {
        data = JSON.parse(dataEntry.getData().toString('utf-8'));
    } catch {
        throw new Error('Invalid backup: data.json is not valid JSON');
    }

    const requiredTables = ['users', 'recipes', 'ingredients', 'steps'];
    for (const table of requiredTables) {
        if (!Array.isArray(data[table])) {
            throw new Error(`Invalid backup: missing or invalid table "${table}"`);
        }
    }

    // Validate upload entries have safe paths
    const entries = zip.getEntries();
    for (const entry of entries) {
        if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
            const ext = path.extname(entry.entryName).toLowerCase();
            if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
                throw new Error(`Invalid backup: disallowed file type "${ext}" in uploads`);
            }
            // Prevent path traversal
            const normalized = path.normalize(entry.entryName);
            if (!normalized.startsWith('uploads/')) {
                throw new Error('Invalid backup: path traversal detected');
            }
        }
    }

    return data;
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

    let data: Record<string, unknown[]>;
    try {
        data = validateBackup(zip);
    } catch (e) {
        throw error(400, (e as Error).message);
    }

    const uploadEntries = zip.getEntries().filter(
        (e) => e.entryName.startsWith('uploads/') && !e.isDirectory
    );

    return json({
        users: data.users?.length ?? 0,
        recipes: data.recipes?.length ?? 0,
        collections: data.collections?.length ?? 0,
        ingredients: data.ingredients?.length ?? 0,
        steps: data.steps?.length ?? 0,
        favorites: data.favorite?.length ?? 0,
        ratings: data.recipeRating?.length ?? 0,
        tips: data.tips?.length ?? 0,
        tags: data.tags?.length ?? 0,
        difficulties: data.difficulty?.length ?? 0,
        settings: data.siteSettings?.length ?? 0,
        images: uploadEntries.length,
    });
};
