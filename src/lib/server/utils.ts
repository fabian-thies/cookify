import {hash, verify} from "@node-rs/argon2";
import {normalizeRecipeSourceUrl} from "../recipe-source";

export class InvalidRecipeSourceUrlError extends Error {}

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

const ARGON2_OPTIONS = {
    // recommended minimum parameters
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
};

export const hashPassword = async (password: string): Promise<string> => {
    return await hash(password, ARGON2_OPTIONS);
};

export const verifyPassword = async (passwordHash: string, password: string): Promise<boolean> => {
    return await verify(passwordHash, password, ARGON2_OPTIONS);
};

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
    sourceUrl: string | null | undefined;
    cookTime: number;
    servings: number;
    difficulty: "easy" | "medium" | "hard";
    ingredientsList: { amount: number | null; unit: string; name: string }[];
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
    const source = formData.get("sourceUrl");
    if (source !== null && typeof source !== "string") throw new InvalidRecipeSourceUrlError();
    const sourceUrl = source === null ? undefined : normalizeRecipeSourceUrl(source);
    if (source?.trim() && !sourceUrl) throw new InvalidRecipeSourceUrlError();
    const cookTimeRaw: string = formData.get("cookTime")?.toString().trim() ?? "";
    const cookTime: number = Number(cookTimeRaw);
    if (cookTimeRaw === "" || !Number.isInteger(cookTime) || cookTime < 0) {
        throw new Error("Invalid cook time");
    }

    const servingsRaw: string = formData.get("servings")?.toString().trim() ?? "";
    const servings: number = Number(servingsRaw);
    if (servingsRaw === "" || !Number.isInteger(servings) || servings < 1) {
        throw new Error("Invalid servings");
    }

    const difficultyRaw: string = formData.get("difficulty")?.toString() ?? "";
    const visibilityRaw = formData.get("visibility")?.toString() ?? "public";

    // Validate and cast difficulty
    if (!["easy", "medium", "hard"].includes(difficultyRaw)) {
        throw new Error("Invalid difficulty level");
    }
    const difficulty = difficultyRaw as "easy" | "medium" | "hard";
    const visibility = visibilityRaw === "private" ? "private" : "public" as "public" | "private";

    validateInputEmpty(title, difficulty);

    const amounts: (number | null)[] = [];
    const units: string[] = [];
    const names: string[] = [];
    const stepsArr: string[] = [];
    const tagsArr: string[] = [];
    const tipsArr: string[] = [];

    for (const amount of formData.getAll("ingredients_amount[]")) {
        const raw = amount.toString().trim();
        if (raw === "") {
            amounts.push(null);
            continue;
        }
        const num = Number(raw);
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

    if (amounts.length !== names.length) {
        throw new Error("Mismatched ingredients fields");
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
        unit: units[index] ?? "",
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
        sourceUrl,
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
