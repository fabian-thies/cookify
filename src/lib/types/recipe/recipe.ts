export type RecipePreview = {
    id: string;
    title: string;
    rating: number;
    description: string;
    cookingTime: number;
    imageUrl: string;
    difficulty: string;
}

export type Recipe = RecipePreview & {
    ingredients: Ingredient[];
    instructions: string[];
    tags: string[];
    servings: number;
    dateCreated: string;
    dateUpdated: string;
}

export type Ingredient = {
    name: string;
    quantity: number;
    unit: string;
}