import {LANGUAGES} from "$lib/constants";

export type UserLanguage = typeof LANGUAGES[number];

export function isUserLanguage(value: unknown): value is UserLanguage {
    return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

