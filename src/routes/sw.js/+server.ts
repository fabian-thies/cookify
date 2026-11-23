import {version} from '$app/environment';

export function GET() {
    // A stable registration needs to load the worker that belongs to this build.
    const worker = `/service-worker.js?v=${encodeURIComponent(version)}`;
    return new Response(`importScripts(${JSON.stringify(worker)});\n`, {
        headers: {
            'Content-Type': 'text/javascript; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    });
}
