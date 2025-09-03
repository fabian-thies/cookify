import type {Actions} from "@sveltejs/kit";

export const actions = {
    createRecipe: async ({ request }) => {
        const data = await request.formData();


    }
} satisfies Actions;