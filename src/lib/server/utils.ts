import {promises as fs} from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Throws an error if any of the inputs is empty
 */
export const validateInputEmpty = (...inputs: (string | number)[]): void => {
    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];

        if (typeof input === 'string' && input.trim() === '') {
            throw new Error(`Input at position ${i} cannot be empty`);
        }

        if (typeof input === 'number' && (isNaN(input) || input === 0)) {
            throw new Error(`Input at position ${i} cannot be empty or invalid number`);
        }
    }
}

export const getDifficultyId = (difficulty: string): number => {
    switch (difficulty) {
        case 'easy': return 1;
        case 'medium': return 2;
        case 'hard': return 3;
        default: throw new Error('Invalid difficulty');
    }
}

const uploadDir = path.join(process.cwd(), 'static', 'uploads');

function extFromMime(mime: string) {
    if (!mime) return '';
    if (mime === 'image/jpeg') return '.jpg';
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    if (mime === 'image/gif') return '.gif';
    return '';
}

export async function saveImage(file: File): Promise<string> {
    await fs.mkdir(uploadDir, {recursive: true});

    const arr = await file.arrayBuffer();
    const buffer = Buffer.from(arr);

    const ext =
        extFromMime(file.type) ||
        path.extname((file as unknown as { name?: string }).name ?? '') ||
        '.jpg';

    const filename = `${crypto.randomUUID()}${ext}`;
    const fullpath = path.join(uploadDir, filename);

    await fs.writeFile(fullpath, buffer);

    return `/uploads/${filename}`;
}
