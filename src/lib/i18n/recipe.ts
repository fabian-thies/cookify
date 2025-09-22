import { m } from '$lib/paraglide/messages';
import type { Difficulty } from '$lib/types/recipe';

export const difficultyLabels: Record<Difficulty, string> = {
    easy: m['recipe.common.difficulty.easy'](),
    medium: m['recipe.common.difficulty.medium'](),
    hard: m['recipe.common.difficulty.hard']()
};
