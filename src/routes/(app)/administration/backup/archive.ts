import { error } from '@sveltejs/kit';
import AdmZip from 'adm-zip';
import path from 'node:path';

const ALLOWED_IMAGE_EXTENSIONS = new Set([
    '.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp'
]);
const MAX_FILE_SIZE = 500 * 1024 * 1024;
export const MAX_DATA_JSON_BYTES = 50 * 1024 * 1024;
export const MAX_ARCHIVE_ENTRIES = 10_000;
export const MAX_UPLOAD_ENTRY_BYTES = 20 * 1024 * 1024;
export const MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024;
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

function assertDeclaredEntrySize(entry: AdmZip.IZipEntry, maxBytes: number, label: string): number {
    const size = entry.header.size;
    const compressedSize = entry.header.compressedSize;
    if (!Number.isFinite(size) || size < 0 || size > maxBytes) {
        throw new Error(`Invalid backup: ${label} exceeds maximum allowed size`);
    }
    if (!Number.isFinite(compressedSize) || compressedSize < 0 || (size === 0 && compressedSize > 16)) {
        throw new Error(`Invalid backup: ${label} has invalid compressed size`);
    }
    return size;
}

export async function readBackup(request: Request) {
    const file = (await request.formData()).get('file');
    if (!(file instanceof File)) throw error(400, 'No file provided');
    if (file.size > MAX_FILE_SIZE) throw error(413, 'File too large');
    if (!file.name.endsWith('.zip')) throw error(400, 'Only .zip files are accepted');

    try {
        const zip = new AdmZip(Buffer.from(await file.arrayBuffer()));
        const entries = zip.getEntries();
        if (entries.length > MAX_ARCHIVE_ENTRIES) {
            throw new Error('Invalid backup: too many archive entries');
        }

        const dataEntries = entries.filter(entry => !entry.isDirectory && entry.entryName === 'data.json');
        if (dataEntries.length === 0) throw new Error('Invalid backup: missing data.json');
        if (dataEntries.length > 1) throw new Error('Invalid backup: duplicate data.json');
        const dataEntry = dataEntries[0];

        let totalDeclaredBytes = assertDeclaredEntrySize(dataEntry, MAX_DATA_JSON_BYTES, 'data.json');
        if (totalDeclaredBytes > MAX_UNCOMPRESSED_BYTES) {
            throw new Error('Invalid backup: archive exceeds maximum uncompressed size');
        }

        const dataBuffer = dataEntry.getData();
        if (dataBuffer.length > MAX_DATA_JSON_BYTES) {
            throw new Error('Invalid backup: data.json exceeds maximum allowed size');
        }
        let totalUncompressedBytes = dataBuffer.length;
        if (totalUncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
            throw new Error('Invalid backup: archive exceeds maximum uncompressed size');
        }

        const parsed: unknown = JSON.parse(dataBuffer.toString('utf-8'));
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

        if (data.recipeNotes !== undefined && (
            !Array.isArray(data.recipeNotes) || data.recipeNotes.some(row =>
                typeof row?.userId !== 'string' || !Number.isInteger(row.recipeId) || typeof row.note !== 'string')
        )) {
            throw new Error('Invalid backup: invalid table "recipeNotes"');
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

        const uploads = entries.filter(entry => !entry.isDirectory && entry.entryName.startsWith('uploads/'));
        const seenUploadPaths = new Set<string>();
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
            const normalizedPath = relativePath.toLowerCase();
            if (seenUploadPaths.has(normalizedPath)) {
                throw new Error(`Invalid backup: duplicate upload "${relativePath}"`);
            }
            seenUploadPaths.add(normalizedPath);

            const declaredSize = assertDeclaredEntrySize(entry, MAX_UPLOAD_ENTRY_BYTES, `upload "${relativePath}"`);
            totalDeclaredBytes += declaredSize;
            if (totalDeclaredBytes > MAX_UNCOMPRESSED_BYTES) {
                throw new Error('Invalid backup: archive exceeds maximum uncompressed size');
            }

            const uploadBuffer = entry.getData();
            if (uploadBuffer.length > MAX_UPLOAD_ENTRY_BYTES) {
                throw new Error(`Invalid backup: upload "${relativePath}" exceeds maximum allowed size`);
            }
            totalUncompressedBytes += uploadBuffer.length;
            if (totalUncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
                throw new Error('Invalid backup: archive exceeds maximum uncompressed size');
            }
        }
        return {data, uploads};
    } catch (e) {
        const message = e instanceof SyntaxError ? 'Invalid backup: data.json is not valid JSON' : (e as Error).message;
        throw error(400, message);
    }
}
