import {error} from '@sveltejs/kit';
import {getCookbookData} from '$lib/server/export/cookbook';
import {buildCookbookZip, cookbookFileName} from '$lib/server/export/zip';

export const GET = async ({locals}) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const cookbook = await getCookbookData(locals.user.id);
    const zip = buildCookbookZip(cookbook);

    return new Response(new Uint8Array(zip), {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${cookbookFileName(cookbook.user.username, 'zip')}"`,
            'Cache-Control': 'no-store'
        }
    });
};
