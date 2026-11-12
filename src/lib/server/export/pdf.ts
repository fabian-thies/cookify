import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import type {CookbookData, CookbookRecipe} from './cookbook';
import type {UserLanguage} from '$lib/types/languages';

type Labels = {
    myCookbook: string;
    contents: string;
    recipeCount: (count: number) => string;
    ingredients: string;
    steps: string;
    tips: string;
    minutes: string;
    servings: string;
    difficulty: string;
    nutrition: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    fiber: string;
    noRecipes: string;
    exported: string;
    difficulties: Record<string, string>;
};

const LABELS: Record<UserLanguage, Labels> = {
    en: {
        myCookbook: 'My Cookbook',
        contents: 'Contents',
        recipeCount: (count) => `${count} recipes`,
        ingredients: 'Ingredients',
        steps: 'Method',
        tips: 'Tips',
        minutes: 'min',
        servings: 'servings',
        difficulty: 'Difficulty',
        nutrition: 'Nutrition per serving',
        calories: 'Calories',
        protein: 'Protein',
        carbs: 'Carbs',
        fat: 'Fat',
        fiber: 'Fiber',
        noRecipes: 'No recipes yet.',
        exported: 'Exported on',
        difficulties: {easy: 'Easy', medium: 'Medium', hard: 'Hard'}
    },
    de: {
        myCookbook: 'Mein Kochbuch',
        contents: 'Inhalt',
        recipeCount: (count) => `${count} Rezepte`,
        ingredients: 'Zutaten',
        steps: 'Zubereitung',
        tips: 'Tipps',
        minutes: 'Min',
        servings: 'Portionen',
        difficulty: 'Schwierigkeit',
        nutrition: 'Nährwerte pro Portion',
        calories: 'Kalorien',
        protein: 'Protein',
        carbs: 'Kohlenhydrate',
        fat: 'Fett',
        fiber: 'Ballaststoffe',
        noRecipes: 'Noch keine Rezepte vorhanden.',
        exported: 'Exportiert am',
        difficulties: {easy: 'Einfach', medium: 'Mittel', hard: 'Schwierig'}
    },
    es: {
        myCookbook: 'Mi libro de recetas',
        contents: 'Contenido',
        recipeCount: (count) => `${count} recetas`,
        ingredients: 'Ingredientes',
        steps: 'Preparación',
        tips: 'Consejos',
        minutes: 'min',
        servings: 'porciones',
        difficulty: 'Dificultad',
        nutrition: 'Valores nutricionales por porción',
        calories: 'Calorías',
        protein: 'Proteína',
        carbs: 'Carbohidratos',
        fat: 'Grasa',
        fiber: 'Fibra',
        noRecipes: 'Todavía no hay recetas.',
        exported: 'Exportado el',
        difficulties: {easy: 'Fácil', medium: 'Medio', hard: 'Difícil'}
    }
};

const LOCALES: Record<UserLanguage, string> = {
    en: 'en-US',
    de: 'de-DE',
    es: 'es-ES'
};

const COLORS = {
    ink: '#151413',
    body: '#3f3a35',
    muted: '#7a736b',
    accent: '#c46a2e',
    rule: '#e4ddd3',
    cream: '#f6efe4'
};

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

type PdfImage = {
    data: Buffer;
    width: number;
    height: number;
};

function localImagePath(image: string): string | null {
    if (!image.startsWith('/uploads/')) return null;
    const requested = path.resolve(UPLOAD_DIR, image.slice('/uploads/'.length));
    const relative = path.relative(UPLOAD_DIR, requested);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
    return requested;
}

async function loadImage(image: string): Promise<PdfImage | null> {
    const filePath = localImagePath(image);
    if (!filePath || !fs.existsSync(filePath)) return null;

    try {
        const {data, info} = await sharp(filePath, {failOn: 'none'})
            .rotate()
            .resize({width: 1200, withoutEnlargement: true})
            .jpeg({quality: 82})
            .toBuffer({resolveWithObject: true});

        return {data, width: info.width, height: info.height};
    } catch (error) {
        console.error('Could not add recipe image to PDF', error);
        return null;
    }
}

function formatQuantity(quantity: number, locale: string): string {
    return new Intl.NumberFormat(locale, {maximumFractionDigits: 2}).format(quantity);
}

function formatDate(date: Date, locale: string): string {
    return new Intl.DateTimeFormat(locale, {dateStyle: 'long'}).format(date);
}

function contentWidth(doc: PDFKit.PDFDocument): number {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
    const bottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y + needed > bottom) {
        doc.addPage();
    }
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string): void {
    ensureSpace(doc, 34);
    doc.moveDown(0.9);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.ink)
        .text(title.toUpperCase(), {characterSpacing: 0.5});
    doc.moveDown(0.25);
    doc.moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor(COLORS.rule)
        .lineWidth(0.7)
        .stroke();
    doc.moveDown(0.5);
}

function renderRecipe(doc: PDFKit.PDFDocument, recipe: CookbookRecipe, image: PdfImage | null, labels: Labels, locale: string): void {
    const left = doc.page.margins.left;
    const width = contentWidth(doc);

    doc.font('Helvetica-Bold').fontSize(23).fillColor(COLORS.ink)
        .text(recipe.title, left, doc.y, {width});
    doc.moveDown(0.25);

    if (recipe.tags.length > 0) {
        doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.accent)
            .text(recipe.tags.join('  ·  '), {width});
        doc.moveDown(0.35);
    }

    const meta = [
        `${recipe.cookingTime} ${labels.minutes}`,
        `${recipe.servings} ${labels.servings}`,
        labels.difficulties[recipe.difficulty] ?? recipe.difficulty
    ].filter(Boolean).join('  ·  ');
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(meta, {width});
    doc.moveDown(0.6);

    if (recipe.description) {
        doc.font('Helvetica-Oblique').fontSize(11).fillColor(COLORS.body)
            .text(recipe.description, {width});
        doc.moveDown(0.5);
    }

    if (image) {
        const maxHeight = 210;
        const scale = Math.min(width / image.width, maxHeight / image.height);
        const imageWidth = image.width * scale;
        const imageHeight = image.height * scale;
        ensureSpace(doc, imageHeight + 16);
        doc.image(image.data, left + (width - imageWidth) / 2, doc.y, {
            width: imageWidth,
            height: imageHeight
        });
        doc.y += imageHeight + 14;
    }

    sectionTitle(doc, labels.ingredients);
    if (recipe.ingredients.length === 0) {
        doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.muted).text('—');
    } else {
        for (const ingredient of recipe.ingredients) {
            ensureSpace(doc, 18);
            const amount = [formatQuantity(ingredient.quantity, locale), ingredient.unit].filter(Boolean).join(' ');
            doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.body)
                .text(`•  ${amount ? `${amount} ` : ''}${ingredient.name}`, {width: width - 4, indent: 2});
        }
    }

    sectionTitle(doc, labels.steps);
    if (recipe.steps.length === 0) {
        doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.muted).text('—');
    } else {
        recipe.steps.forEach((step, index) => {
            ensureSpace(doc, 22);
            doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.body)
                .text(`${index + 1}.  ${step}`, {width});
            doc.moveDown(0.25);
        });
    }

    if (recipe.tips.length > 0) {
        sectionTitle(doc, labels.tips);
        for (const tip of recipe.tips) {
            ensureSpace(doc, 18);
            doc.font('Helvetica-Oblique').fontSize(10.5).fillColor(COLORS.body)
                .text(`•  ${tip}`, {width: width - 4, indent: 2});
        }
    }

    const nutrition = [
        recipe.calories != null ? `${labels.calories} ${recipe.calories} kcal` : null,
        recipe.protein != null ? `${labels.protein} ${recipe.protein} g` : null,
        recipe.carbs != null ? `${labels.carbs} ${recipe.carbs} g` : null,
        recipe.fat != null ? `${labels.fat} ${recipe.fat} g` : null,
        recipe.fiber != null ? `${labels.fiber} ${recipe.fiber} g` : null
    ].filter(Boolean);

    if (nutrition.length > 0) {
        sectionTitle(doc, labels.nutrition);
        doc.font('Helvetica').fontSize(10).fillColor(COLORS.body)
            .text(nutrition.join('  ·  '), {width});
    }
}

export async function buildCookbookPdf(cookbook: CookbookData): Promise<Buffer> {
    const labels = LABELS[cookbook.user.language] ?? LABELS.en;
    const locale = LOCALES[cookbook.user.language] ?? LOCALES.en;
    const doc = new PDFDocument({
        size: 'A4',
        margins: {top: 56, bottom: 56, left: 56, right: 56},
        bufferPages: true,
        info: {
            Title: `${labels.myCookbook} – ${cookbook.user.username}`,
            Author: 'Cookify',
            Creator: 'Cookify'
        }
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
    });

    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.ink);
    const width = doc.page.width - 112;
    doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(58)
        .text('Cookify', 56, 170, {width, align: 'center'});
    doc.moveDown(0.3);
    doc.fillColor(COLORS.cream).font('Helvetica').fontSize(28)
        .text(labels.myCookbook, {width, align: 'center'});
    doc.moveDown(0.9);
    doc.fillColor('#b9b0a6').fontSize(13)
        .text(`${cookbook.user.username} · ${labels.recipeCount(cookbook.recipes.length)}`, {width, align: 'center'});
    doc.fillColor('#8e867c').fontSize(10.5)
        .text(`${labels.exported} ${formatDate(cookbook.exportedAt, locale)}`, 56, doc.page.height - 110, {
            width,
            align: 'center'
        });

    const tocPage = () => {
        doc.addPage();
        doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(24)
            .text(labels.contents, 56, 64, {width});
        doc.moveDown(0.4);
        doc.moveTo(56, doc.y)
            .lineTo(doc.page.width - 56, doc.y)
            .strokeColor(COLORS.accent)
            .lineWidth(1.5)
            .stroke();
        doc.moveDown(0.8);
    };

    tocPage();

    if (cookbook.recipes.length === 0) {
        doc.font('Helvetica').fontSize(12).fillColor(COLORS.muted).text(labels.noRecipes, {width});
    } else {
        cookbook.recipes.forEach((recipe, index) => {
            if (doc.y + 22 > doc.page.height - doc.page.margins.bottom) {
                tocPage();
            }
            doc.font('Helvetica').fontSize(11.5).fillColor(COLORS.ink)
                .text(`${index + 1}.  ${recipe.title}`, {width});
            doc.moveDown(0.2);
        });
    }

    for (const recipe of cookbook.recipes) {
        doc.addPage();
        const image = await loadImage(recipe.image);
        renderRecipe(doc, recipe, image, labels, locale);
    }

    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index++) {
        if (index === 0) continue;

        doc.switchToPage(index);
        const originalBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        const footerY = doc.page.height - 36;
        doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted)
            .text(`${labels.myCookbook} · ${cookbook.user.username}`, 56, footerY, {
                width: doc.page.width - 112,
                align: 'left',
                lineBreak: false
            });
        doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted)
            .text(String(index), 56, footerY, {
                width: doc.page.width - 112,
                align: 'right',
                lineBreak: false
            });

        doc.page.margins.bottom = originalBottom;
    }

    doc.end();
    return finished;
}
