export interface CreateRecipeInput {
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

export interface UpdateRecipeInput extends CreateRecipeInput {
    id: number;
}

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export type Difficulty = typeof DIFFICULTIES[number];