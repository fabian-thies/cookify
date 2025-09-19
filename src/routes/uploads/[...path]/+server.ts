import { error, type RequestHandler } from '@sveltejs/kit';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createReadStream } from 'node:fs';

const uploadsDir = path.resolve(process.cwd(), 'uploads');

const MIME_TYPES: Record<string, string> = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
};

export const GET: RequestHandler = async ({ params }) => {
    const slug = params.path;
    if (!slug) throw error(404, 'Not found');

    const segments = slug.split('/').filter(Boolean);
    const requestedPath = path.resolve(uploadsDir, ...segments);
    const relative = path.relative(uploadsDir, requestedPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw error(404, 'Not found');
    }

    try {
        const ext = path.extname(requestedPath).toLowerCase();
        const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

        const nodeStream = createReadStream(requestedPath);

        const webStream = Readable.toWeb(nodeStream) as unknown as globalThis.ReadableStream<Uint8Array>;

        return new Response(webStream, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });
    } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err?.code === 'ENOENT') throw error(404, 'Not found');
        throw error(500, 'Unable to read uploaded file');
    }
};
