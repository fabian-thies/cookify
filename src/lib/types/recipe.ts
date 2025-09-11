interface CreateRecipeInput {
    title: string;
    description: string;
    cookTime: number;
    servings: number;
    userId: string;
    difficulty: string;
    ingredientsList: { name: string; amount: number; unit: string }[];
    steps: string[];
    tags: string[];
    image: string;
}

interface UpdateRecipeInput extends CreateRecipeInput {
    id: number;
}