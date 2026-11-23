import { error } from '@sveltejs/kit';
import AdmZip from 'adm-zip';
import path from 'node:path';

const ALLOWED_IMAGE_EXTENSIONS = new Set([
    '.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp'
]);
const MAX_FILE_SIZE = 500 * 1024 * 1024;
export const RESTORE_DIRECTORY_PREFIX = '..restore-';

const timestampFields: Record<string, string[]> = {
    siteSettings: ['updatedAt'],
    recipes: ['createdAt', 'updatedAt'],
    recipeRating: ['createdAt', 'updatedAt'],
    passkey: ['createdAt'],
    mealPlan: ['createdAt'],
    cookHistory: ['cookedAt'],
    shoppingListItems: ['createdAt', 'updatedAt'],
};

export async function readBackup(request: Request) {
    const file = (await request.formData()).get('file');
    if (!(file instanceof File)) throw error(400, 'No file provided');
    if (file.size > MAX_FILE_SIZE) throw error(413, 'File too large');
    if (!file.name.endsWith('.zip')) throw error(400, 'Only .zip files are accepted');

    try {
        const zip = new AdmZip(Buffer.from(await file.arrayBuffer()));
        const dataEntry = zip.getEntry('data.json');
        if (!dataEntry) throw new Error('Invalid backup: missing data.json');
        const parsed: unknown = JSON.parse(dataEntry.getData().toString('utf-8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Invalid backup: data.json must be an object');
        }
        const data = parsed as Record<string, Record<string, unknown>[]>;
        for (const name of ['users', 'recipes', 'ingredients', 'steps']) {
            if (!Array.isArray(data[name])) {
                throw new Error(`Invalid backup: missing or invalid table "${name}"`);
            }
        }
        if (data.shoppingListShares !== undefined && (
            !Array.isArray(data.shoppingListShares) ||
            data.shoppingListShares.some(share => typeof share?.ownerId !== 'string' || typeof share?.memberId !== 'string')
        )) {
            throw new Error('Invalid backup: invalid table "shoppingListShares"');
        }

        for (const [name, fields] of Object.entries(timestampFields)) {
            const rows = data[name];
            if (rows === undefined) continue;
            if (!Array.isArray(rows)) throw new Error(`Invalid backup: invalid table "${name}"`);
            for (const row of rows) {
                for (const field of fields) {
                    const value = row[field];
                    if (value === undefined) continue;
                    const date = typeof value === 'string' ? new Date(value) : null;
                    if (!date || Number.isNaN(date.getTime())) {
                        throw new Error(`Invalid backup: invalid timestamp ${name}.${field}`);
                    }
                    row[field] = date;
                }
            }
        }

        const uploads = zip.getEntries().filter(entry => !entry.isDirectory && entry.entryName.startsWith('uploads/'));
        for (const entry of uploads) {
            const relativePath = entry.entryName.slice('uploads/'.length);
            const segments = relativePath.split('/');
            if (relativePath.includes('\\') || segments[0].startsWith(RESTORE_DIRECTORY_PREFIX) ||
                segments.some(segment => !segment || segment === '.' || segment === '..')) {
                throw new Error('Invalid backup: invalid upload path');
            }
            const extension = path.posix.extname(relativePath).toLowerCase();
            if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
                throw new Error(`Invalid backup: disallowed file type "${extension}"`);
            }
        }
        return {data, uploads};
    } catch (e) {
        const message = e instanceof SyntaxError ? 'Invalid backup: data.json is not valid JSON' : (e as Error).message;
        throw error(400, message);
    }
}
