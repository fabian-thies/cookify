import {lookup} from 'node:dns/promises';
import {BlockList, isIP} from 'node:net';
import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';

const blocked = new BlockList();
for (const [address, prefix] of [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
    ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
    ['224.0.0.0', 4], ['240.0.0.0', 4]
] as const) blocked.addSubnet(address, prefix, 'ipv4');
blocked.addSubnet('2001::', 23, 'ipv6');
blocked.addSubnet('2002::', 16, 'ipv6');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');

export function isPublicAddress(address: string): boolean {
    const family = isIP(address);
    if (family === 4) return !blocked.check(address, 'ipv4');
    return family === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}

/** Resolve once and pin the connection to that public address, including on redirects. */
export async function downloadImage(source: string, maxBytes: number): Promise<File> {
    const signal = AbortSignal.timeout(20_000);
    if (source.length > 2048) throw new Error('Image URL is too long');
    let url = new URL(source);
    for (let redirects = 0; redirects <= 3; redirects++) {
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
            || (url.port && !['80', '443'].includes(url.port))) throw new Error('Invalid image URL');
        const hostname = url.hostname.replace(/^\[|\]$/g, '');
        const addresses = isIP(hostname)
            ? [{address: hostname, family: isIP(hostname)}]
            : await lookup(hostname, {all: true});
        if (!addresses.length || addresses.some(({address}) => !isPublicAddress(address))) {
            throw new Error('Image URL must use a public address');
        }
        signal.throwIfAborted();
        const pinned = addresses[0];
        const response = await new Promise<import('node:http').IncomingMessage>((resolve, reject) => {
            const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
                signal,
                family: pinned.family,
                headers: {Accept: 'image/*'},
                lookup: (_hostname, _options, callback) => callback(null, pinned.address, pinned.family)
            }, resolve);
            request.on('error', reject);
            request.end();
        });
        if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
            response.destroy();
            if (!response.headers.location) throw new Error('Missing image redirect');
            url = new URL(response.headers.location, url);
            continue;
        }
        if (response.statusCode !== 200 || Number(response.headers['content-length']) > maxBytes) {
            response.destroy();
            throw new Error('Image download failed or image is too large');
        }
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of response) {
            size += chunk.length;
            if (size > maxBytes) {
                response.destroy();
                throw new Error('Image is too large');
            }
            chunks.push(Buffer.from(chunk));
        }
        return new File([new Uint8Array(Buffer.concat(chunks))], 'remote-image');
    }
    throw new Error('Too many image redirects');
}
