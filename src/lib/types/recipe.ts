import { m } from "$lib/paraglide/messages";

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

export const difficultyLabels: Record<Difficulty, string> = {
    easy: m["recipe.common.difficulty.easy"](),
    medium: m["recipe.common.difficulty.medium"](),
    hard: m["recipe.common.difficulty.hard"]()
};

export const difficultySelectOptions = DIFFICULTIES.map(difficulty => ({
    value: difficulty,
    label: difficultyLabels[difficulty]
}));