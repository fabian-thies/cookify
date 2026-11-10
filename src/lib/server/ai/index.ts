import heicConvert from 'heic-convert';
import {env} from '$env/dynamic/private';

/**
 * Minimal OpenAI-compatible client used for all AI features.
 * Defaults target Ollama's OpenAI-compatible endpoint because Cookify is
 * primarily deployed with an Ollama key. Any compatible provider works by
 * setting OPENAI_BASE_URL / OPENAI_MODEL.
 */
function envValue(...keys: string[]): string {
    for (const key of keys) {
        const value = (env[key] ?? process.env[key])?.trim();
        if (value) return value;
    }
    return '';
}

const API_KEY = envValue('OPENAI_KEY', 'AI_API_KEY');
const BASE_URL = (envValue('OPENAI_BASE_URL', 'AI_BASE_URL') || 'https://ollama.com/v1')
    .replace(/\/+$/, '');
const TEXT_MODEL = envValue('OPENAI_MODEL', 'AI_MODEL') || 'deepseek-v4.1-flash:1017';
const VISION_MODEL = envValue('OPENAI_VISION_MODEL', 'AI_VISION_MODEL') || 'deepseek-v4.1-flash:1017';
const REQUEST_TIMEOUT_MS = 90_000;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_CHARS = 20_000;

export type AiRecipeMode = 'text' | 'recipe-photo' | 'dish-photo' | 'ingredients-photo';

export interface AiNutrition {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
}

export interface AiRecipe {
    title: string;
    description: string;
    image: string | null;
    cookTime: number;
    servings: number;
    difficulty: 'easy' | 'medium' | 'hard';
    ingredients: { name: string; amount: number; unit: string }[];
    steps: string[];
    tags: string[];
    tips: string[];
    nutrition: AiNutrition | null;
    sourceUrl: string | null;
}

export function isAiConfigured(): boolean {
    return API_KEY.length > 0;
}

function languageName(locale: string): string {
    if (locale === 'de') return 'German';
    if (locale === 'es') return 'Spanish';
    return 'English';
}

function systemPrompt(locale: string): string {
    return `You are Cookify's recipe assistant. You create, extract, adapt and estimate recipes.
Always answer with exactly one JSON object and nothing else.
Write all human-readable text in ${languageName(locale)}.
The JSON must use this shape:
{
  "title": string,
  "description": string,
  "cookTime": integer (total minutes),
  "servings": integer,
  "difficulty": "easy" | "medium" | "hard",
  "ingredients": [{"name": string, "amount": integer (whole number), "unit": string}],
  "steps": [string],
  "tags": [string],
  "tips": [string],
  "nutrition": {"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number}
}
Nutrition is per serving. calories is kcal, all other values are grams. Use numbers, never strings.
Never return markdown or explanations.`;
}

function nutritionSystemPrompt(): string {
    return `You estimate nutrition values for recipes. Always answer with exactly one JSON object and nothing else:
{"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number}
calories is kcal per serving, all other values are grams per serving. Use numbers, never strings.`;
}

function asNumber(value: unknown): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const match = value.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
        if (!match) return null;
        const parsed = Number(match[0]);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function toNumber(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = asNumber(value);
    if (parsed === null) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function toInt(value: unknown, fallback: number, min: number, max: number): number {
    return Math.round(toNumber(value, fallback, min, max));
}

function toMinutes(value: unknown): number {
    if (typeof value === 'string') {
        const iso = value.trim().match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
        if (iso && (iso[1] || iso[2] || iso[3])) {
            const days = Number(iso[1] ?? 0);
            const hours = Number(iso[2] ?? 0);
            const minutes = Number(iso[3] ?? 0);
            return Math.min(1_440, Math.max(1, days * 1_440 + hours * 60 + minutes));
        }
    }

    return toInt(value, 30, 1, 1_440);
}

function toNullableInt(value: unknown, max: number): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = asNumber(value);
    if (parsed === null || parsed < 0) return null;
    return Math.round(Math.min(parsed, max));
}

function toStringArray(value: unknown, limit: number): string[] {
    if (!Array.isArray(value)) return [];

    return value
        .map((item) => {
            if (typeof item === 'string') return item.trim();
            if (item && typeof item === 'object') {
                const object = item as Record<string, unknown>;
                const text = object.step ?? object.text ?? object.name ?? object.tip ?? object.description;
                return typeof text === 'string' ? text.trim() : '';
            }
            return '';
        })
        .filter(Boolean)
        .slice(0, limit);
}

function normalizeDifficulty(value: unknown): 'easy' | 'medium' | 'hard' {
    const text = String(value ?? '').toLowerCase();
    if (text.includes('easy') || text.includes('einfach') || text.includes('fácil') || text.includes('facil')) return 'easy';
    if (text.includes('hard') || text.includes('schwer') || text.includes('difícil') || text.includes('dificil')) return 'hard';
    return 'medium';
}

function normalizeNutrition(value: unknown): AiNutrition | null {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Record<string, unknown>;
    const nutrition: AiNutrition = {
        calories: toNullableInt(raw.calories, 10_000),
        protein: toNullableInt(raw.protein, 1_000),
        carbs: toNullableInt(raw.carbs, 1_000),
        fat: toNullableInt(raw.fat, 1_000),
        fiber: toNullableInt(raw.fiber, 1_000)
    };

    return Object.values(nutrition).some((value) => value !== null) ? nutrition : null;
}

function normalizeRecipe(raw: unknown, options: { sourceUrl?: string | null; image?: string | null } = {}): AiRecipe {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error('AI returned an invalid recipe');
    }

    const data = raw as Record<string, unknown>;
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    const description = typeof data.description === 'string' ? data.description.trim() : '';

    if (!title) {
        throw new Error('AI returned a recipe without a title');
    }

    const rawIngredients = Array.isArray(data.ingredients) ? data.ingredients : [];
    const ingredients = rawIngredients
        .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const ingredient = item as Record<string, unknown>;
            const name = typeof ingredient.name === 'string' ? ingredient.name.trim() : '';
            if (!name) return null;
            return {
                name,
                amount: Math.max(1, Math.round(toNumber(ingredient.amount, 1, 1, 100_000))),
                unit: typeof ingredient.unit === 'string' ? ingredient.unit.trim() : ''
            };
        })
        .filter((item): item is { name: string; amount: number; unit: string } => item !== null)
        .slice(0, 60);

    if (ingredients.length === 0) {
        throw new Error('AI returned a recipe without ingredients');
    }

    const steps = toStringArray(data.steps, 60);
    if (steps.length === 0) {
        throw new Error('AI returned a recipe without steps');
    }

    return {
        title,
        description,
        image: options.image ?? null,
        cookTime: toMinutes(data.cookTime),
        servings: toInt(data.servings, 2, 1, 100),
        difficulty: normalizeDifficulty(data.difficulty),
        ingredients,
        steps,
        tags: [...new Set(toStringArray(data.tags, 20))],
        tips: toStringArray(data.tips, 20),
        nutrition: normalizeNutrition(data.nutrition),
        sourceUrl: options.sourceUrl ?? null
    };
}

function parseJsonObject(content: string): unknown {
    const cleaned = content
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
        throw new Error('AI did not return JSON');
    }

    return JSON.parse(cleaned.slice(start, end + 1));
}

function contentToString(content: unknown): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .map((part) => {
                if (typeof part === 'string') return part;
                if (part && typeof part === 'object' && 'text' in part) {
                    return String((part as { text?: unknown }).text ?? '');
                }
                return '';
            })
            .join('');
    }
    return '';
}

async function requestChat(
    system: string,
    user: string,
    image?: { dataUrl: string; base64: string },
    jsonMode = true
): Promise<string> {
    const model = image ? VISION_MODEL : TEXT_MODEL;
    const userContent = image
        ? [
            {type: 'text', text: user},
            {type: 'image_url', image_url: {url: image.dataUrl}}
        ]
        : user;
    const messages = [
        {role: 'system', content: system},
        {role: 'user', content: userContent}
    ];

    const body: Record<string, unknown> = {
        model,
        messages,
        temperature: 0.2,
        // The configured model is a reasoning model: leave room for its
        // reasoning tokens plus the final JSON answer.
        max_tokens: 8_192
    };

    if (jsonMode) {
        body.response_format = {type: 'json_object'};
    }

    let response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    // Some OpenAI-compatible servers do not implement response_format.
    if (!response.ok && jsonMode && (response.status === 400 || response.status === 422)) {
        delete body.response_format;
        response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${API_KEY}`
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        });
    }

    if (!response.ok && image) {
        const native = await requestOllamaNative(system, user, image);
        if (native) return native;
    }

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`AI request failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
    }

    const data = await response.json() as {
        choices?: { message?: { content?: unknown } }[];
    };

    const content = contentToString(data.choices?.[0]?.message?.content).trim();
    if (!content) {
        throw new Error('AI returned an empty response');
    }

    return content;
}

/**
 * Ollama's OpenAI-compatible layer has had gaps for vision requests.
 * Fall back to the native /api/chat endpoint when we are talking to Ollama.
 */
async function requestOllamaNative(
    system: string,
    user: string,
    image: { dataUrl: string; base64: string }
): Promise<string | null> {
    let origin: string;
    try {
        const url = new URL(BASE_URL);
        if (!url.hostname.includes('ollama') && url.port !== '11434') return null;
        origin = url.origin;
    } catch {
        return null;
    }

    try {
        const response = await fetch(`${origin}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: VISION_MODEL,
                messages: [
                    {role: 'system', content: system},
                    {role: 'user', content: user, images: [image.base64]}
                ],
                stream: false,
                format: 'json'
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        });

        if (!response.ok) return null;

        const data = await response.json() as { message?: { content?: unknown } };
        const content = contentToString(data.message?.content).trim();
        return content || null;
    } catch {
        return null;
    }
}

async function chatJson(
    system: string,
    user: string,
    image?: { dataUrl: string; base64: string }
): Promise<unknown> {
    const first = await requestChat(system, user, image);
    try {
        return parseJsonObject(first);
    } catch {
        const second = await requestChat(
            `${system}\nIMPORTANT: Return only the JSON object. No markdown fences.`,
            `${user}\n\nReturn only the JSON object now.`,
            image
        );
        return parseJsonObject(second);
    }
}

function guessMimeType(file: File): string {
    if (file.type) return file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    const name = file.name.toLowerCase();
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.webp')) return 'image/webp';
    if (name.endsWith('.gif')) return 'image/gif';
    if (name.endsWith('.heic')) return 'image/heic';
    if (name.endsWith('.heif')) return 'image/heif';
    return 'image/jpeg';
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
    return <ArrayBuffer>buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function fileToImage(file: File): Promise<{ dataUrl: string; base64: string }> {
    if (file.size === 0) throw new Error('Image is empty');
    if (file.size > MAX_IMAGE_BYTES) throw new Error('Image is too large');

    let mime = guessMimeType(file);
    let buffer = Buffer.from(await file.arrayBuffer());

    const isHeic = mime === 'image/heic' || mime === 'image/heif'
        || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

    if (isHeic) {
        const converted = await heicConvert({
            buffer: toArrayBuffer(buffer),
            format: 'JPEG',
            quality: 0.9
        }) as ArrayBuffer;
        buffer = Buffer.from(new Uint8Array(converted));
        mime = 'image/jpeg';
    }

    if (!mime.startsWith('image/')) {
        throw new Error('Uploaded file is not an image');
    }

    const base64 = buffer.toString('base64');
    return {dataUrl: `data:${mime};base64,${base64}`, base64};
}

function htmlToText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_TEXT_CHARS);
}

export function extractOgImage(html: string, pageUrl: string): string | null {
    const patterns = [
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (!match?.[1]) continue;
        try {
            return new URL(match[1].replace(/&amp;/g, '&'), pageUrl).href;
        } catch {
            continue;
        }
    }

    return null;
}

export async function generateRecipeFromText(prompt: string, locale: string): Promise<AiRecipe> {
    const raw = await chatJson(
        systemPrompt(locale),
        `Create a complete recipe for: ${prompt.trim()}\n\nInclude estimated nutrition per serving.`
    );

    return normalizeRecipe(raw);
}

export async function generateRecipeFromImage(
    file: File,
    mode: Exclude<AiRecipeMode, 'text'>,
    locale: string
): Promise<AiRecipe> {
    const image = await fileToImage(file);

    const instructions: Record<Exclude<AiRecipeMode, 'text'>, string> = {
        'recipe-photo': 'The image is a photo of a recipe (cookbook page, handwritten note or screenshot). Extract the recipe exactly. Fill unreadable gaps with sensible cooking knowledge.',
        'dish-photo': 'The image shows a cooked dish. Identify it and recreate a complete recipe that produces this dish.',
        'ingredients-photo': 'The image shows ingredients (for example inside a fridge or on a counter). Create a recipe that mainly uses these ingredients. You may assume salt, pepper, oil and water.'
    };

    const raw = await chatJson(
        systemPrompt(locale),
        `${instructions[mode]}\n\nReturn the full recipe JSON, including estimated nutrition per serving.`,
        image
    );

    return normalizeRecipe(raw);
}

export async function generateRecipeFromHtml(html: string, url: string, locale: string): Promise<AiRecipe> {
    const text = htmlToText(html);
    if (!text) throw new Error('Page has no readable content');

    const raw = await chatJson(
        systemPrompt(locale),
        `Extract the recipe from this web page. If something is missing, estimate it sensibly.
URL: ${url}

PAGE TEXT:
${text}`
    );

    return normalizeRecipe(raw, {
        sourceUrl: url,
        image: extractOgImage(html, url)
    });
}

export async function adjustRecipe(
    recipe: AiRecipe,
    instruction: string,
    locale: string
): Promise<AiRecipe> {
    const raw = await chatJson(
        systemPrompt(locale),
        `Here is the current recipe as JSON:
${JSON.stringify(recipe)}

Apply this change: ${instruction.trim()}

Keep everything that does not need to change and return the complete updated recipe JSON.`
    );

    return normalizeRecipe(raw, {sourceUrl: recipe.sourceUrl, image: recipe.image});
}

export async function estimateNutritionForRecipe(recipe: AiRecipe): Promise<AiNutrition> {
    const raw = await chatJson(
        nutritionSystemPrompt(),
        `Estimate the nutrition per serving for this recipe:\n${JSON.stringify(recipe)}`
    );

    if (!raw || typeof raw !== 'object') {
        throw new Error('AI returned invalid nutrition data');
    }

    const source = 'nutrition' in raw ? (raw as { nutrition?: unknown }).nutrition : raw;
    const nutrition = normalizeNutrition(source);
    if (!nutrition || nutrition.calories === null) {
        throw new Error('AI returned incomplete nutrition data');
    }

    return nutrition;
}

