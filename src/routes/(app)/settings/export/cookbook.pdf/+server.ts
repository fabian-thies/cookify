import {error} from '@sveltejs/kit';
import {getCookbookData} from '$lib/server/export/cookbook';
import {buildCookbookPdf} from '$lib/server/export/pdf';
import {cookbookFileName} from '$lib/server/export/zip';

export const GET = async ({locals}) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const cookbook = await getCookbookData(locals.user.id);
    const pdf = await buildCookbookPdf(cookbook);

    return new Response(new Uint8Array(pdf), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${cookbookFileName(cookbook.user.username, 'pdf')}"`,
            'Cache-Control': 'no-store'
        }
    });
};
