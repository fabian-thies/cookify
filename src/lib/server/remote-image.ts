import {lookup} from 'node:dns/promises';
import {BlockList, isIP} from 'node:net';
import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {Transform} from 'node:stream';
import {createBrotliDecompress, createGunzip, createInflate} from 'node:zlib';

const blocked = new BlockList();
for (const [address, prefix] of [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
    ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
    ['224.0.0.0', 4], ['240.0.0.0', 4]
] as const) blocked.addSubnet(address, prefix, 'ipv4');
blocked.addSubnet('2001::', 23, 'ipv6');
blocked.addSubnet('2001:db8::', 32, 'ipv6');
blocked.addSubnet('2002::', 16, 'ipv6');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');

export class UnsafeRemoteUrlError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UnsafeRemoteUrlError';
    }
}

export interface FetchPublicResourceOptions {
    maxBytes: number;
    timeoutMs?: number;
    maxRedirects?: number;
    headers?: Record<string, string>;
}

export interface FetchPublicResourceResult {
    buffer: Buffer;
    statusCode: number;
    statusMessage: string;
    headers: import('node:http').IncomingHttpHeaders;
    url: string;
}

export function isPublicAddress(address: string): boolean {
    const family = isIP(address);
    if (family === 4) return !blocked.check(address, 'ipv4');
    return family === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}

/** Resolve once and pin the connection to a verified public address, including on redirects. */
export async function fetchPublicResource(
    source: string,
    options: FetchPublicResourceOptions
): Promise<FetchPublicResourceResult> {
    const {maxBytes, timeoutMs = 20_000, maxRedirects = 3, headers} = options;
    const signal = AbortSignal.timeout(timeoutMs);
    if (source.length > 2048) throw new UnsafeRemoteUrlError('URL is too long');

    let url: URL;
    try {
        url = new URL(source);
    } catch {
        throw new UnsafeRemoteUrlError('Invalid URL format');
    }

    for (let redirects = 0; redirects <= maxRedirects; redirects++) {
        if (url.href.length > 2048) throw new UnsafeRemoteUrlError('URL is too long');
        if (!['http:', 'https:'].includes(url.protocol)) {
            throw new UnsafeRemoteUrlError('Only HTTP(S) URLs are allowed');
        }
        if (url.username || url.password) {
            throw new UnsafeRemoteUrlError('URL credentials are not allowed');
        }
        if (url.port && !['80', '443'].includes(url.port)) {
            throw new UnsafeRemoteUrlError('Only standard HTTP(S) ports are allowed');
        }

        const hostname = url.hostname.replace(/^\[|\]$/g, '');
        const literalFamily = isIP(hostname);
        const addresses = literalFamily
            ? [{address: hostname, family: literalFamily}]
            : await lookup(hostname, {all: true});
        if (!addresses.length || addresses.some(({address}) => !isPublicAddress(address))) {
            throw new UnsafeRemoteUrlError('URLs pointing to internal networks are not allowed');
        }

        signal.throwIfAborted();
        const pinned = addresses.find((entry) => entry.family === 4) ?? addresses[0];
        const response = await new Promise<import('node:http').IncomingMessage>((resolve, reject) => {
            const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
                signal,
                family: pinned.family,
                headers,
                lookup: (_hostname, lookupOptions, callback) => {
                    if (lookupOptions && typeof lookupOptions === 'object' && 'all' in lookupOptions && lookupOptions.all) {
                        (callback as unknown as (
                            err: NodeJS.ErrnoException | null,
                            entries: Array<{address: string; family: number}>
                        ) => void)(null, [{address: pinned.address, family: pinned.family}]);
                        return;
                    }
                    callback(null, pinned.address, pinned.family);
                }
            }, resolve);
            request.on('error', reject);
            request.end();
        });

        const statusCode = response.statusCode ?? 0;
        if ([301, 302, 303, 307, 308].includes(statusCode)) {
            response.destroy();
            const location = response.headers.location;
            if (!location) throw new Error('Missing redirect location');
            try {
                url = new URL(location, url);
            } catch {
                throw new UnsafeRemoteUrlError('Invalid redirect URL');
            }
            continue;
        }

        const statusMessage = response.statusMessage ?? '';
        if (statusCode < 200 || statusCode >= 300) {
            response.destroy();
            throw new Error(`Failed to fetch URL: ${statusCode}${statusMessage ? ` ${statusMessage}` : ''}`);
        }

        const contentLength = Number(response.headers['content-length']);
        if (Number.isFinite(contentLength) && contentLength > maxBytes) {
            response.destroy();
            throw new Error('Response is too large');
        }

        const encodingHeader = response.headers['content-encoding'];
        const encoding = (Array.isArray(encodingHeader) ? encodingHeader.join(',') : encodingHeader ?? '')
            .trim()
            .toLowerCase();

        let decoder: ReturnType<typeof createGunzip> | ReturnType<typeof createInflate> | ReturnType<typeof createBrotliDecompress> | null = null;
        let rawLimiter: Transform | null = null;
        let stream: AsyncIterable<Buffer | Uint8Array | string> = response;

        if (encoding && encoding !== 'identity') {
            if (encoding === 'gzip' || encoding === 'x-gzip') {
                decoder = createGunzip({maxOutputLength: maxBytes + 1});
            } else if (encoding === 'deflate') {
                decoder = createInflate({maxOutputLength: maxBytes + 1});
            } else if (encoding === 'br') {
                decoder = createBrotliDecompress({maxOutputLength: maxBytes + 1});
            } else {
                response.destroy();
                throw new Error(`Unsupported content encoding: ${encoding}`);
            }

            let rawSize = 0;
            rawLimiter = new Transform({
                transform(chunk: Buffer, _enc, callback) {
                    rawSize += chunk.length;
                    if (rawSize > maxBytes) {
                        callback(new Error('Response is too large'));
                        return;
                    }
                    callback(null, chunk);
                }
            });
            response.on('error', (err) => rawLimiter?.destroy(err));
            rawLimiter.on('error', (err) => {
                response.destroy();
                decoder?.destroy(err);
            });
            response.pipe(rawLimiter).pipe(decoder);
            stream = decoder;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        try {
            for await (const chunk of stream) {
                const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                size += buf.length;
                if (size > maxBytes) {
                    throw new Error('Response is too large');
                }
                chunks.push(buf);
            }
        } catch (err) {
            response.destroy();
            rawLimiter?.destroy();
            decoder?.destroy();
            if (err && typeof err === 'object' && 'code' in err && err.code === 'ERR_BUFFER_TOO_LARGE') {
                throw new Error('Response is too large');
            }
            throw err;
        }

        return {
            buffer: Buffer.concat(chunks),
            statusCode,
            statusMessage,
            headers: response.headers,
            url: url.href
        };
    }

    throw new Error('Too many redirects');
}

/** Resolve once and pin the connection to that public address, including on redirects. */
export async function downloadImage(source: string, maxBytes: number): Promise<File> {
    const result = await fetchPublicResource(source, {
        maxBytes,
        timeoutMs: 20_000,
        maxRedirects: 3,
        headers: {Accept: 'image/*'}
    });
    if (result.statusCode !== 200) {
        throw new Error('Image download failed');
    }
    return new File([new Uint8Array(result.buffer)], 'remote-image');
}
