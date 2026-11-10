import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types.js';
import {getLocale} from '$lib/paraglide/runtime';
import {
    adjustRecipe,
    generateRecipeFromImage,
    generateRecipeFromText,
    type AiRecipe,
    type AiRecipeMode
} from '$lib/server/ai';
import {isAiAvailable} from '$lib/server/ai/availability';
import {checkAiRateLimit} from '$lib/server/ai/rate-limit';

const MODES: Exclude<AiRecipeMode, 'text'>[] = ['recipe-photo', 'dish-photo', 'ingredients-photo'];

function isAiRecipe(value: unknown): value is AiRecipe {
    if (!value || typeof value !== 'object') return false;
    const recipe = value as Record<string, unknown>;
    return typeof recipe.title === 'string'
        && Array.isArray(recipe.ingredients)
        && Array.isArray(recipe.steps);
}

export const POST: RequestHandler = async ({request, locals}) => {
    if (!locals.user) {
        return json({error: 'Unauthorized'}, {status: 401});
    }

    if (!await isAiAvailable()) {
        return json({error: 'AI features are not available'}, {status: 503});
    }

    if (!checkAiRateLimit(locals.user.id)) {
        return json({error: 'Too many AI requests. Please try again shortly.'}, {status: 429});
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return json({error: 'Invalid request body'}, {status: 400});
    }

    const action = String(formData.get('action') ?? 'generate');

    try {
        if (action === 'adjust') {
            const instruction = String(formData.get('instruction') ?? '').trim();
            if (!instruction) {
                return json({error: 'Instruction is required'}, {status: 400});
            }
            if (instruction.length > 2_000) {
                return json({error: 'Instruction is too long'}, {status: 400});
            }

            const recipeJson = String(formData.get('recipe') ?? '');
            if (recipeJson.length > 100_000) {
                return json({error: 'Recipe data is too large'}, {status: 400});
            }

            let recipe: unknown;
            try {
                recipe = JSON.parse(recipeJson);
            } catch {
                return json({error: 'Invalid recipe data'}, {status: 400});
            }

            if (!isAiRecipe(recipe)) {
                return json({error: 'Invalid recipe data'}, {status: 400});
            }

            return json(await adjustRecipe(recipe, instruction, getLocale()));
        }

        if (action !== 'generate') {
            return json({error: 'Unknown action'}, {status: 400});
        }

        const prompt = String(formData.get('prompt') ?? '').trim();
        const mode = String(formData.get('mode') ?? 'text') as AiRecipeMode;
        const image = formData.get('image');

        if (mode === 'text') {
            if (!prompt) {
                return json({error: 'Prompt is required'}, {status: 400});
            }
            if (prompt.length > 4_000) {
                return json({error: 'Prompt is too long'}, {status: 400});
            }

            return json(await generateRecipeFromText(prompt, getLocale()));
        }

        if (!MODES.includes(mode as Exclude<AiRecipeMode, 'text'>)) {
            return json({error: 'Invalid photo mode'}, {status: 400});
        }

        if (!(image instanceof File) || image.size === 0) {
            return json({error: 'Image is required'}, {status: 400});
        }

        if (image.size > 15 * 1024 * 1024) {
            return json({error: 'Image is too large'}, {status: 400});
        }

        return json(await generateRecipeFromImage(image, mode as Exclude<AiRecipeMode, 'text'>, getLocale()));
    } catch (error) {
        console.error('AI recipe request failed:', error);
        return json({error: 'AI request failed'}, {status: 502});
    }
};
