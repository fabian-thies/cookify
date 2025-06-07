// TODO: i18n
export const getDifficultyText = (difficulty: string) => {
    const difficultyMap: Record<string, string> = {
        'easy': 'Einfach',
        'medium': 'Mittel',
        'hard': 'Schwer'
    };
    return difficultyMap[difficulty.toLowerCase()] || difficulty;
};

export const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
        case "Einfach":
            return "badge-success";
        case "Mittel":
            return "badge-warning";
        case "Schwer":
            return "badge-error";
        default:
            return "badge-neutral";
    }
}