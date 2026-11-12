import {promises as fs} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import {IMAGE_VARIANTS, type ImageVariant} from '$lib/images';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const MAX_INPUT_PIXELS = 50_000_000;

const HEIC_EXTENSIONS = new Set(['.heic', '.heif', '.heics', '.heifs']);
const ORIGINAL_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif',
    '.heic', '.heif', '.heics', '.heifs'
];
const VARIANT_FILE_PATTERN = /^(.+)-(thumb|medium|large)\.webp$/;

// Deliberately no SVG: same-origin SVG can execute script and must never be served inline.
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
    '.webp': 'image/webp'
};

export class ImageUploadError extends Error {
    readonly reason: 'too-large' | 'unsupported-format';

    constructor(reason: 'too-large' | 'unsupported-format') {
        super(reason === 'too-large' ? 'Image is too large' : 'Unsupported image format');
        this.name = 'ImageUploadError';
        this.reason = reason;
    }
}

/**
 * Detects the image format from its magic bytes. The client-supplied MIME type and
 * filename are attacker-controlled, so they must never decide what gets stored.
 */
function detectImageType(input: Buffer): { ext: string; mime: string } | null {
    if (input.length >= 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) {
        return {ext: '.jpg', mime: 'image/jpeg'};
    }

    if (input.length >= 8 && input.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return {ext: '.png', mime: 'image/png'};
    }

    if (input.length >= 6) {
        const gifSignature = input.subarray(0, 6).toString('ascii');
        if (gifSignature === 'GIF87a' || gifSignature === 'GIF89a') {
            return {ext: '.gif', mime: 'image/gif'};
        }
    }

    if (input.length >= 12
        && input.subarray(0, 4).toString('ascii') === 'RIFF'
        && input.subarray(8, 12).toString('ascii') === 'WEBP') {
        return {ext: '.webp', mime: 'image/webp'};
    }

    if (input.length >= 12 && input.subarray(4, 8).toString('ascii') === 'ftyp') {
        const boxSize = Math.min(input.length, input.readUInt32BE(0));
        // Also inspect the compatible brands: real AVIF files often use mif1/heic as major brand.
        const brands = input.subarray(8, Math.max(12, boxSize)).toString('ascii');
        if (brands.includes('avif') || brands.includes('avis')) {
            return {ext: '.avif', mime: 'image/avif'};
        }
        if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'].includes(brands.slice(0, 4))) {
            return {ext: '.heic', mime: 'image/heic'};
        }
    }

    return null;
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
        const data = await sharp(normalized, {failOn: 'none', limitInputPixels: MAX_INPUT_PIXELS})
            .rotate()
            .resize({width, withoutEnlargement: true})
            .webp({quality: 80, effort: 4})
            .toBuffer();

        await writeFileAtomic(path.join(UPLOAD_DIR, variantFileName(fileName, variant as ImageVariant)), data);
    }));
}

export async function saveImage(file: File): Promise<string> {
    await fs.mkdir(UPLOAD_DIR, {recursive: true});

    if (file.size > MAX_IMAGE_SIZE) {
        throw new ImageUploadError('too-large');
    }

    const input = Buffer.from(await file.arrayBuffer());
    const detected = detectImageType(input);

    // Only known image signatures are accepted, so SVG, HTML and script polyglots are rejected.
    if (!detected) {
        throw new ImageUploadError('unsupported-format');
    }

    const isHeic = HEIC_EXTENSIONS.has(detected.ext);
    const output = isHeic ? await convertHeic(input) : input;
    const ext = isHeic ? '.jpg' : detected.ext;
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

/**
 * Removes an uploaded image and its generated variants. Used when a write succeeded but
 * the surrounding request failed, so uploads cannot accumulate as orphans.
 */
export async function deleteImage(imageUrl: string): Promise<void> {
    const prefix = '/uploads/';
    if (!imageUrl.startsWith(prefix)) return;

    const fileName = imageUrl.slice(prefix.length);
    // Only file names generated by saveImage (uuid + extension) may be removed.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i.test(fileName)) {
        return;
    }

    const extension = path.extname(fileName);
    const baseName = fileName.slice(0, fileName.length - extension.length);

    try {
        await Promise.all([
            fs.rm(path.join(UPLOAD_DIR, fileName), {force: true}),
            ...Object.keys(IMAGE_VARIANTS).map((variant) =>
                fs.rm(path.join(UPLOAD_DIR, `${baseName}-${variant}.webp`), {force: true}))
        ]);
    } catch (error) {
        // Cleanup is best effort and must never change the response of the calling request.
        console.error('Failed to delete uploaded image', error);
    }
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
