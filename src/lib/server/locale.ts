import {isUserLanguage, type UserLanguage} from '$lib/types/languages';

export function resolveAppLocale(configured: unknown, cookie?: unknown, profile?: unknown): UserLanguage {
    if (isUserLanguage(profile)) return profile;
    if (isUserLanguage(cookie)) return cookie;
    const normalized = typeof configured === 'string' ? configured.trim().toLowerCase() : configured;
    return isUserLanguage(normalized) ? normalized : 'en';
}
