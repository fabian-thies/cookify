import {error, type RequestHandler} from '@sveltejs/kit';
import path from 'node:path';
import {promises as fs} from 'node:fs';
import {Readable} from 'node:stream';
import {createReadStream} from 'node:fs';
import {MIME_TYPES, resolveImageVariant, UPLOAD_DIR} from '$lib/server/image';

export const GET: RequestHandler = async ({params}) => {
    const slug = params.path;
    if (!slug) throw error(404, 'Not found');

    const segments = slug.split('/').filter(Boolean);
    const requestedPath = path.resolve(UPLOAD_DIR, ...segments);
    const relative = path.relative(UPLOAD_DIR, requestedPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw error(404, 'Not found');
    }

    let filePath = requestedPath;
    let contentType = MIME_TYPES[path.extname(requestedPath).toLowerCase()] ?? 'application/octet-stream';

    try {
        await fs.access(filePath);
    } catch {
        // Variants for images uploaded before the image pipeline existed are generated lazily.
        const resolved = await resolveImageVariant(requestedPath);
        if (!resolved) throw error(404, 'Not found');
        filePath = resolved.filePath;
        contentType = resolved.contentType;
    }

    try {
        const nodeStream = createReadStream(filePath);
        const webStream = Readable.toWeb(nodeStream) as unknown as globalThis.ReadableStream<Uint8Array>;

        return new Response(webStream, {
            headers: {
                'Content-Type': contentType,
                // Uploads are user-controlled bytes: never let the browser reinterpret them.
                'X-Content-Type-Options': 'nosniff',
                'Content-Security-Policy': "default-src 'none'; sandbox",
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });
    } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err?.code === 'ENOENT') throw error(404, 'Not found');
        throw error(500, 'Unable to read uploaded file');
    }
};
