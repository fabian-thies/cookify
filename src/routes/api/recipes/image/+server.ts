import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import sharp from 'sharp';
import {downloadImage} from '$lib/server/remote-image';
import {MAX_IMAGE_SIZE} from '$lib/server/image';

export const POST: RequestHandler = async ({request, locals}) => {
    if (!locals.user) return json({error: 'Unauthorized'}, {status: 401});

    let url: unknown;
    try {
        ({url} = await request.json());
    } catch {
        return json({error: 'Invalid request'}, {status: 400});
    }
    if (typeof url !== 'string' || !url.trim() || url.length > 2048) {
        return json({error: 'Invalid image URL'}, {status: 400});
    }

    try {
        const file = await downloadImage(url.trim(), MAX_IMAGE_SIZE);
        const input = Buffer.from(await file.arrayBuffer());
        const image = sharp(input, {limitInputPixels: 50_000_000});
        const metadata = await image.metadata();
        if (!['jpeg', 'png', 'webp', 'gif', 'avif', 'heif'].includes(metadata.format ?? '')) {
            return json({error: 'Unsupported image format'}, {status: 400});
        }
        // Return the image to the form, so saving uses the verified bytes without a second download.
        const output = await image.rotate().resize({width: 1600, withoutEnlargement: true})
            .webp({quality: 90}).toBuffer();
        if (output.length > MAX_IMAGE_SIZE) return json({error: 'Image too large'}, {status: 400});
        return new Response(new Uint8Array(output), {
            headers: {'Content-Type': 'image/webp', 'Cache-Control': 'no-store'}
        });
    } catch {
        return json({error: 'Could not download image'}, {status: 400});
    }
};
