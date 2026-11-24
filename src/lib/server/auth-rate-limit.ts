import type {RequestEvent} from '@sveltejs/kit';

interface RateLimitBucket {
    timestamps: number[];
    expiresAt: number;
}

const MAX_MAP_ENTRIES = 10_000;
const PRUNE_INTERVAL_MS = 60_000;

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const SIXTY_MINUTES_MS = 60 * 60 * 1000;

const LOGIN_IP_MAX_ATTEMPTS = 20;
const LOGIN_USER_MAX_ATTEMPTS = 10;
const REGISTER_IP_MAX_ATTEMPTS = 10;
const PASSKEY_OPTIONS_IP_MAX_REQUESTS = 30;
const PASSKEY_VERIFY_IP_MAX_ATTEMPTS = 20;

function normalizeKey(value: string): string {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : 'unknown';
}

class SlidingWindowLimiter {
    private readonly buckets = new Map<string, RateLimitBucket>();
    private lastPruneAt = 0;

    constructor(
        private readonly maxAttempts: number,
        private readonly windowMs: number,
        private readonly maxEntries: number = MAX_MAP_ENTRIES
    ) {}

    private getActiveTimestamps(key: string, now: number): number[] {
        const bucket = this.buckets.get(key);
        if (!bucket) {
            return [];
        }

        const active = bucket.timestamps.filter((timestamp) => now - timestamp < this.windowMs);
        if (active.length === 0) {
            this.buckets.delete(key);
            return [];
        }

        if (active.length !== bucket.timestamps.length) {
            bucket.timestamps = active;
            bucket.expiresAt = active[active.length - 1] + this.windowMs;
        }

        return active;
    }

    private pruneExpired(now: number): void {
        for (const [key, bucket] of this.buckets) {
            if (bucket.expiresAt <= now) {
                this.buckets.delete(key);
                continue;
            }
            const active = bucket.timestamps.filter((timestamp) => now - timestamp < this.windowMs);
            if (active.length === 0) {
                this.buckets.delete(key);
            } else if (active.length !== bucket.timestamps.length) {
                bucket.timestamps = active;
                bucket.expiresAt = active[active.length - 1] + this.windowMs;
            }
        }
    }

    private enforceMaxSize(now: number): void {
        if (this.buckets.size < this.maxEntries) {
            return;
        }

        this.pruneExpired(now);

        while (this.buckets.size >= this.maxEntries) {
            const oldestKey = this.buckets.keys().next().value;
            if (oldestKey === undefined) {
                break;
            }
            this.buckets.delete(oldestKey);
        }
    }

    maybePrune(now: number): void {
        if (
            this.buckets.size > 0 &&
            (now - this.lastPruneAt >= Math.min(this.windowMs, PRUNE_INTERVAL_MS) || now < this.lastPruneAt)
        ) {
            this.pruneExpired(now);
            this.lastPruneAt = now;
        }
    }

    isAllowed(key: string, now: number): boolean {
        return this.getActiveTimestamps(key, now).length < this.maxAttempts;
    }

    record(key: string, now: number): void {
        const active = this.getActiveTimestamps(key, now);
        active.push(now);
        this.buckets.delete(key);
        this.enforceMaxSize(now);
        this.buckets.set(key, {
            timestamps: active,
            expiresAt: now + this.windowMs
        });
    }

    consume(key: string, now: number): boolean {
        this.maybePrune(now);
        if (!this.isAllowed(key, now)) {
            return false;
        }
        this.record(key, now);
        return true;
    }

    delete(key: string): void {
        this.buckets.delete(key);
    }

    clear(): void {
        this.buckets.clear();
        this.lastPruneAt = 0;
    }
}

const loginIpLimiter = new SlidingWindowLimiter(LOGIN_IP_MAX_ATTEMPTS, FIFTEEN_MINUTES_MS);
const loginUserLimiter = new SlidingWindowLimiter(LOGIN_USER_MAX_ATTEMPTS, FIFTEEN_MINUTES_MS);
const registerIpLimiter = new SlidingWindowLimiter(REGISTER_IP_MAX_ATTEMPTS, SIXTY_MINUTES_MS);
const passkeyOptionsIpLimiter = new SlidingWindowLimiter(PASSKEY_OPTIONS_IP_MAX_REQUESTS, FIFTEEN_MINUTES_MS);
const passkeyVerifyIpLimiter = new SlidingWindowLimiter(PASSKEY_VERIFY_IP_MAX_ATTEMPTS, FIFTEEN_MINUTES_MS);

export function getClientIp(event: RequestEvent): string {
    try {
        const address = event.getClientAddress();
        return typeof address === 'string' && address.trim().length > 0 ? address.trim() : 'unknown';
    } catch {
        return 'unknown';
    }
}

export function checkLoginRateLimit(ip: string, username: string, now: number = Date.now()): boolean {
    const ipKey = normalizeKey(ip);
    const userKey = normalizeKey(username.toLowerCase());

    loginIpLimiter.maybePrune(now);
    loginUserLimiter.maybePrune(now);

    if (!loginIpLimiter.isAllowed(ipKey, now)) {
        return false;
    }

    if (!loginUserLimiter.isAllowed(userKey, now)) {
        loginIpLimiter.record(ipKey, now);
        return false;
    }

    loginIpLimiter.record(ipKey, now);
    loginUserLimiter.record(userKey, now);
    return true;
}

export function resetLoginUserRateLimit(username: string): void {
    loginUserLimiter.delete(normalizeKey(username.toLowerCase()));
}

export function checkRegisterRateLimit(ip: string, now: number = Date.now()): boolean {
    return registerIpLimiter.consume(normalizeKey(ip), now);
}

export function checkPasskeyOptionsRateLimit(ip: string, now: number = Date.now()): boolean {
    return passkeyOptionsIpLimiter.consume(normalizeKey(ip), now);
}

export function checkPasskeyVerifyRateLimit(ip: string, now: number = Date.now()): boolean {
    return passkeyVerifyIpLimiter.consume(normalizeKey(ip), now);
}

export function clearAuthRateLimits(): void {
    loginIpLimiter.clear();
    loginUserLimiter.clear();
    registerIpLimiter.clear();
    passkeyOptionsIpLimiter.clear();
    passkeyVerifyIpLimiter.clear();
}
