import {promises as fs} from 'fs';
import path from 'path';
import crypto from 'crypto';
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
        case 'easy': return 1;
        case 'medium': return 2;
        case 'hard': return 3;
        default: throw new Error('Invalid difficulty');
    }
}

const uploadDir = path.join(process.cwd(), 'uploads');

function extFromMime(mime: string) {
    if (!mime) return '';
    if (mime === 'image/jpeg') return '.jpg';
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    if (mime === 'image/gif') return '.gif';
    return '';
}

export async function saveImage(file: File): Promise<string> {
    await fs.mkdir(uploadDir, {recursive: true});

    const arr = await file.arrayBuffer();
    const buffer = Buffer.from(arr);

    const ext =
        extFromMime(file.type) ||
        path.extname((file as unknown as { name?: string }).name ?? '') ||
        '.jpg';

    const filename = `${crypto.randomUUID()}${ext}`;
    const fullpath = path.join(uploadDir, filename);

    await fs.writeFile(fullpath, buffer);

    return `/uploads/${filename}`;
}

export function parseRecipeFormData(formData: FormData) {
    const title: string = formData.get("title")?.toString() ?? "";
    const description: string = formData.get("description")?.toString() ?? "";
    const cookTime: number = Number(formData.get("cookTime"));
    const servings: number = Number(formData.get("servings"));
    const difficulty: string = formData.get("difficulty")?.toString() ?? "";

    validateInputEmpty(title, description, cookTime, servings, difficulty);

    const amounts: number[] = [];
    const units: string[] = [];
    const names: string[] = [];
    const stepsArr: string[] = [];
    const tagsArr: string[] = [];

    for (const amount of formData.getAll("ingredients_amount[]")) {
        const num = Number(amount);
        if (Number.isNaN(num)) {
            throw new Error("invalid");
        }
        amounts.push(num);
    }

    for (const unit of formData.getAll("ingredients_unit[]")) {
        const str = unit.toString();
        if (str.trim() === "") {
            throw new Error("invalid");
        }
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

    const ingredientsList = amounts.map((amount, index) => ({
        amount: amount,
        unit: units[index],
        name: names[index]
    }));

    return {
        title,
        description,
        cookTime,
        servings,
        difficulty,
        ingredientsList,
        steps: stepsArr,
        tags: tagsArr
    };
}