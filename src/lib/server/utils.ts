import {hash} from "@node-rs/argon2";

/**
 * Throws an error if any of the inputs is empty
 */
export const validateInputEmpty = (...inputs: (string | number)[]): void => {
    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];

        if (typeof input === 'string' && input.trim() === '') {
            throw new Error(`Input at position ${i} cannot be empty`);
        }

        if (typeof input === 'number' && (isNaN(input) || input === 0)) {
            throw new Error(`Input at position ${i} cannot be empty or invalid number`);
        }
    }
}

export const hashPassword = async (password: string): Promise<string> => {
    return await hash(password, {
        // recommended minimum parameters
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
    })
}

export const getDifficultyId = (difficulty: string): number => {
    switch (difficulty.toLowerCase()) {
        case 'easy':
            return 1;
        case 'medium':
            return 2;
        case 'hard':
            return 3;
        default:
            throw new Error('Invalid difficulty');
    }
}

export function parseRecipeFormData(formData: FormData): {
    title: string;
    description: string;
    cookTime: number;
    servings: number;
    difficulty: "easy" | "medium" | "hard";
    ingredientsList: { amount: number; unit: string; name: string }[];
    steps: string[];
    tags: string[];
    tips: string[];
    visibility: "public" | "private";
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
} {
    const title: string = formData.get("title")?.toString() ?? "";
    const description: string = formData.get("description")?.toString() ?? "";
    const cookTime: number = Number(formData.get("cookTime"));
    const servings: number = Number(formData.get("servings"));
    const difficultyRaw: string = formData.get("difficulty")?.toString() ?? "";
    const visibilityRaw = formData.get("visibility")?.toString() ?? "public";

    // Validate and cast difficulty
    if (!["easy", "medium", "hard"].includes(difficultyRaw)) {
        throw new Error("Invalid difficulty level");
    }
    const difficulty = difficultyRaw as "easy" | "medium" | "hard";
    const visibility = visibilityRaw === "private" ? "private" : "public" as "public" | "private";

    validateInputEmpty(title, description, cookTime, servings, difficulty);

    const amounts: number[] = [];
    const units: string[] = [];
    const names: string[] = [];
    const stepsArr: string[] = [];
    const tagsArr: string[] = [];
    const tipsArr: string[] = [];

    for (const amount of formData.getAll("ingredients_amount[]")) {
        const num = Number(amount);
        if (!Number.isFinite(num) || num < 0) {
            throw new Error("invalid");
        }
        amounts.push(num);
    }

    for (const unit of formData.getAll("ingredients_unit[]")) {
        const str = unit.toString();
        units.push(str);
    }

    for (const ingredient of formData.getAll("ingredients_name[]")) {
        const str = ingredient.toString();
        if (str.trim() === "") {
            throw new Error("invalid");
        }
        names.push(str);
    }

    for (const step of formData.getAll("instructions_description[]")) {
        const str = step.toString();
        if (str.trim() === "") {
            throw new Error("invalid");
        }
        stepsArr.push(str);
    }

    for (const tag of formData.getAll("tags[]")) {
        const str = tag.toString().trim();
        if (str !== "") {
            tagsArr.push(str);
        }
    }

    for (const tip of formData.getAll("tips[]")) {
        const str = tip.toString().trim();
        if (str !== "") {
            tipsArr.push(str);
        }
    }

    const ingredientsList = amounts.map((amount, index) => ({
        amount: amount,
        unit: units[index],
        name: names[index]
    }));

    const parseOptionalInt = (name: string): number | null => {
        const raw = formData.get(name)?.toString().trim() ?? "";
        if (raw === "") return null;
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 0) return null;
        return Math.round(value);
    };

    return {
        title,
        description,
        cookTime,
        servings,
        difficulty,
        ingredientsList,
        steps: stepsArr,
        tags: tagsArr,
        tips: tipsArr,
        visibility,
        calories: parseOptionalInt("calories"),
        protein: parseOptionalInt("protein"),
        carbs: parseOptionalInt("carbs"),
        fat: parseOptionalInt("fat"),
        fiber: parseOptionalInt("fiber")
    };
}
