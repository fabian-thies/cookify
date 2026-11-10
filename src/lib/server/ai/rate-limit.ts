const windows = new Map<string, {count: number; resetAt: number}>();

/**
 * Basic per-user throttle for paid AI calls. Single-process only, but enough
 * to stop accidental loops in the usual one-container deployment.
 */
export function checkAiRateLimit(userId: string, limit = 20, windowMs = 60_000): boolean {
    const now = Date.now();
    const entry = windows.get(userId);

    if (!entry || entry.resetAt <= now) {
        windows.set(userId, {count: 1, resetAt: now + windowMs});
        return true;
    }

    if (entry.count >= limit) {
        return false;
    }

    entry.count += 1;
    return true;
}
