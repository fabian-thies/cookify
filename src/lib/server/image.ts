import {promises as fs} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import {IMAGE_VARIANTS, type ImageVariant} from '$lib/images';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const HEIC_EXTENSIONS = new Set(['.heic', '.heif', '.heics', '.heifs']);
const ORIGINAL_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif',
    '.heic', '.heif', '.heics', '.heifs'
];
const VARIANT_FILE_PATTERN = /^(.+)-(thumb|medium|large)\.webp$/;

export const MIME_TYPES: Record<string, string> = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.heics': 'image/heic-sequence',
    '.heifs': 'image/heif-sequence',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
};

function extFromMime(mime: string) {
    if (!mime) return '';
    if (mime === 'image/jpeg') return '.jpg';
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    if (mime === 'image/gif') return '.gif';
    if (mime === 'image/heic') return '.heic';
    if (mime === 'image/heif') return '.heif';
    if (mime === 'image/heic-sequence') return '.heics';
    if (mime === 'image/heif-sequence') return '.heifs';
    return '';
}

const toArrayBuffer = (buf: Buffer): ArrayBuffer =>
    <ArrayBuffer>buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

async function convertHeic(input: Buffer): Promise<Buffer> {
    const jpegAb = (await heicConvert({
        buffer: toArrayBuffer(input),
        format: 'JPEG',
        quality: 0.9,
    })) as ArrayBuffer;

    return Buffer.from(new Uint8Array(jpegAb));
}

export function variantFileName(fileName: string, variant: ImageVariant): string {
    const ext = path.extname(fileName);
    return `${fileName.slice(0, fileName.length - ext.length)}-${variant}.webp`;
}

async function writeFileAtomic(filePath: string, data: Buffer): Promise<void> {
    const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(tempPath, data);

    try {
        await fs.rename(tempPath, filePath);
    } catch (error) {
        await fs.rm(tempPath, {force: true});
        const code = (error as NodeJS.ErrnoException).code;
        // Another request generated the same variant first (Windows reports EPERM on overwrite).
        if (code !== 'EEXIST' && code !== 'EPERM') {
            throw error;
        }
    }
}

export async function writeImageVariants(input: Buffer, sourceExtension: string, fileName: string): Promise<void> {
    const normalized = HEIC_EXTENSIONS.has(sourceExtension.toLowerCase())
        ? await convertHeic(input)
        : input;

    await Promise.all(Object.entries(IMAGE_VARIANTS).map(async ([variant, width]) => {
        const data = await sharp(normalized, {failOn: 'none'})
            .rotate()
            .resize({width, withoutEnlargement: true})
            .webp({quality: 80, effort: 4})
            .toBuffer();

        await writeFileAtomic(path.join(UPLOAD_DIR, variantFileName(fileName, variant as ImageVariant)), data);
    }));
}

export async function saveImage(file: File): Promise<string> {
    await fs.mkdir(UPLOAD_DIR, {recursive: true});

    const input = Buffer.from(await file.arrayBuffer());
    const givenExt =
        extFromMime(file.type) ||
        path.extname((file as unknown as { name?: string }).name ?? '') ||
        '';

    const isHeic =
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        HEIC_EXTENSIONS.has(givenExt.toLowerCase());

    const output = isHeic ? await convertHeic(input) : input;
    const ext = isHeic ? '.jpg' : (givenExt || '.jpg');
    const fileName = `${crypto.randomUUID()}${ext}`;

    await fs.writeFile(path.join(UPLOAD_DIR, fileName), output);

    // A failed variant must not reject the upload: the original is still usable and the
    // uploads route regenerates variants on the first request.
    try {
        await writeImageVariants(output, ext, fileName);
    } catch (error) {
        console.error('Failed to generate image variants', error);
    }

    return `/uploads/${fileName}`;
}

async function findOriginalForVariant(variantName: string): Promise<string | null> {
    const match = VARIANT_FILE_PATTERN.exec(variantName);
    if (!match) {
        return null;
    }

    for (const extension of ORIGINAL_EXTENSIONS) {
        const candidate = path.join(UPLOAD_DIR, `${match[1]}${extension}`);
        try {
            await fs.access(candidate);
            return candidate;
        } catch {
            // Try the next extension.
        }
    }

    return null;
}

/**
 * Generates a missing variant on demand (e.g. images uploaded before the pipeline existed)
 * and returns the file the request should be served from. Falls back to the original when
 * the image cannot be converted.
 */
export async function resolveImageVariant(requestedPath: string): Promise<{filePath: string; contentType: string} | null> {
    const originalPath = await findOriginalForVariant(path.basename(requestedPath));
    if (!originalPath) {
        return null;
    }

    const originalContentType = MIME_TYPES[path.extname(originalPath).toLowerCase()] ?? 'application/octet-stream';

    try {
        const input = await fs.readFile(originalPath);
        await writeImageVariants(input, path.extname(originalPath), path.basename(originalPath));
        return {filePath: requestedPath, contentType: 'image/webp'};
    } catch (error) {
        console.error('Failed to generate image variant on demand', error);
        return {filePath: originalPath, contentType: originalContentType};
    }
}
