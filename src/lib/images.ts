export const IMAGE_VARIANTS = {
    thumb: 480,
    medium: 960,
    large: 1600
} as const;

export type ImageVariant = keyof typeof IMAGE_VARIANTS;

export function isUploadedImage(url: string | null | undefined): url is string {
    return typeof url === 'string' && url.startsWith('/uploads/');
}

/**
 * Uploaded images are stored together with `-thumb.webp`, `-medium.webp` and `-large.webp`
 * variants. Remote images (scraped/AI) are passed through unchanged.
 */
export function imageVariantUrl(url: string | null | undefined, variant: ImageVariant): string {
    if (!url) {
        return '';
    }
    if (!isUploadedImage(url)) {
        return url;
    }

    const queryIndex = url.search(/[?#]/);
    const path = queryIndex === -1 ? url : url.slice(0, queryIndex);
    const suffix = queryIndex === -1 ? '' : url.slice(queryIndex);
    const slashIndex = path.lastIndexOf('/');
    const fileName = path.slice(slashIndex + 1);
    const dotIndex = fileName.lastIndexOf('.');

    if (dotIndex <= 0) {
        return url;
    }

    return `${path.slice(0, slashIndex + 1)}${fileName.slice(0, dotIndex)}-${variant}.webp${suffix}`;
}
