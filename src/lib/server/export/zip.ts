import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import type {CookbookData} from './cookbook';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export function cookbookFileName(username: string, extension: 'zip' | 'pdf'): string {
    const slug = username
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'cookbook';
    const date = new Date().toISOString().slice(0, 10);
    return `cookify-cookbook-${slug}-${date}.${extension}`;
}

function localImage(image: string): {fullPath: string; fileName: string} | null {
    if (!image.startsWith('/uploads/')) return null;

    const fullPath = path.resolve(UPLOAD_DIR, image.slice('/uploads/'.length));
    const relative = path.relative(UPLOAD_DIR, fullPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
    if (!fs.existsSync(fullPath)) return null;

    return {fullPath, fileName: path.basename(fullPath)};
}

export function buildCookbookZip(cookbook: CookbookData): Buffer {
    const zip = new AdmZip();
    const includedImages = new Set<string>();

    const recipes = cookbook.recipes.map((recipe) => {
        const image = localImage(recipe.image);
        if (!image) return recipe;

        const archivePath = `images/${image.fileName}`;
        if (!includedImages.has(archivePath)) {
            zip.addLocalFile(image.fullPath, 'images');
            includedImages.add(archivePath);
        }

        return {...recipe, image: archivePath};
    });

    const payload = {
        format: 'cookify-cookbook',
        version: 1,
        exportedAt: cookbook.exportedAt.toISOString(),
        user: cookbook.user,
        recipes,
        collections: cookbook.collections
    };

    zip.addFile('cookbook.json', Buffer.from(JSON.stringify(payload, null, 2), 'utf8'));
    zip.addFile('README.txt', Buffer.from(
        'Cookify cookbook export\n\n' +
        'cookbook.json contains all recipes, ingredients, steps, tips, collections and nutrition values.\n' +
        'All locally uploaded recipe photos are stored in the images/ folder.\n' +
        'Remote image URLs are kept as URLs in cookbook.json.\n',
        'utf8'
    ));

    return zip.toBuffer();
}
