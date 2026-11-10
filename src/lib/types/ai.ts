export interface AiNutrition {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
}

export interface AiRecipeResult {
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
