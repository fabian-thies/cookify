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

export const getDifficultyId = (difficulty: string): number => {
    switch (difficulty) {
        case 'easy': return 1;
        case 'medium': return 2;
        case 'hard': return 3;
        default: throw new Error('Invalid difficulty');
    }
}
