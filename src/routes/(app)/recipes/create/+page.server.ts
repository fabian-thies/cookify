import {fail} from '@sveltejs/kit';
import type {Actions, PageServerLoad} from './$types';
import type {NavAction} from "$lib/types";

export const load: PageServerLoad = async ({locals}) => {
    return {
        user: locals.user,
        navActions: [
            {type: 'Cancel', formId: 'create-recipe', formaction: '/'},
            {type: 'Publish', formId: 'create-recipe', formaction: '?'}
        ] as NavAction[]
    };
};

export const actions: Actions = {
    default: async ({request, locals, fetch}) => {
        const data = await request.formData();

        const recipeName = data.get('recipe-name')?.toString() ?? '';
        const servings = data.get('servings')?.toString() ?? '';
        const cookingTime = data.get('duration')?.toString() ?? '';
        const visibility = data.get('visibility')?.toString() ?? 'Draft';
        const preparationSteps = data.get('instructions')?.toString() ?? '';
        const imageFile = data.get('imageFile') as File;

        const errors: Record<string, boolean> = {};

        if (!recipeName) errors.recipeName = true;
        if (!servings || isNaN(+servings)) errors.servings = true;
        if (!cookingTime) errors.cookingTime = true;
        if (!imageFile || imageFile.size <= 0) errors.imageFile = true;
        if (imageFile.size >= 30_000_000) {
            errors.imageFileSize = true; // TODO: show on frontend
        }
        if (!preparationSteps) errors.preparationSteps = true;

        const ingredientData: { name: string; quantity: string }[] = [];
        for (const [key, value] of data.entries()) {
            if (key.startsWith('ingredients-name-')) {
                const idx = key.replace('ingredients-name-', '');
                const name = value.toString();
                const quantity = data.get(`ingredients-quantity-${idx}`)?.toString() ?? '';
                if (name && quantity) {
                    ingredientData.push({name, quantity});
                }
            }
        }
        if (ingredientData.length === 0) errors.ingredients = true;

        if (Object.keys(errors).length > 0) {
            return fail(400, {
                errors,
                recipeName,
                servings,
                cookingTime,
                visibility,
                preparationSteps,
                ingredientData,
            });
        }

        const payload = new FormData();
        payload.append('userId', locals.user?.id ?? '');
        payload.append('recipeName', recipeName);
        payload.append('servings', servings);
        payload.append('cookingTime', cookingTime);
        payload.append('visibility', visibility);
        payload.append('preparationSteps', preparationSteps);
        payload.append('imageFile', imageFile as File, (imageFile as File).name);
        payload.append('ingredients', JSON.stringify(ingredientData));

        const response = await fetch('/api/recipes', {
            method: 'PUT',
            body: payload
        });

        if (response.ok) {
            return {success: true};
        } else {
            const {message} = await response.json().catch(() => ({}));
            return fail(response.status, {
                error: message ?? 'Failed to create recipe'
            });
        }
    }
};
