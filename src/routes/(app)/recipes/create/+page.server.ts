import {fail} from '@sveltejs/kit';
import type {Actions} from './$types';

export const actions: Actions = {
    default: async ({request}) => {
        const formData = await request.formData();

        const recipeName = formData.get('recipe-name')?.toString();
        const servings = formData.get('servings')?.toString();
        const cookingTime = formData.get('duration')?.toString();
        const visibility = formData.get('visibility')?.toString() || 'Draft';
        const preparationSteps = formData.get('instructions')?.toString();

        const imageFile = formData.get('imageFile') as File;

        const errors: Record<string, boolean> = {};

        if (!recipeName) errors.recipeName = true;
        if (!servings || isNaN(Number(servings))) errors.servings = true;
        if (!cookingTime) errors.cookingTime = true;
        if (imageFile.size <= 0) errors.imageFile = true;
        if (!preparationSteps) errors.preparationSteps = true;

        const ingredientData: { name: string; quantity: string }[] = [];
        let hasIngredients = false;

        for (const [key, value] of formData.entries()) {
            if (key.startsWith('ingredients-name-')) {
                const index = key.replace('ingredients-name-', '');
                const quantityKey = `ingredients-quantity-${index}`;
                const quantity = formData.get(quantityKey)?.toString() || '';

                if (value && quantity) {
                    hasIngredients = true;
                    ingredientData.push({
                        name: value.toString(),
                        quantity
                    });
                }
            }
        }

        console.log(imageFile);

        if (!hasIngredients) errors.ingredients = true;

        console.log(errors)

        // If validation error
        if (Object.keys(errors).length > 0) {
            return fail(400, {errors});
        }
    }
};