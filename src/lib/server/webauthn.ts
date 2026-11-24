import type {RequestEvent} from '@sveltejs/kit';
import {and, eq, gt, isNull, lt} from 'drizzle-orm';
import {sha256} from '@oslojs/crypto/sha2';
import {encodeBase64url, encodeHexLowerCase} from '@oslojs/encoding';
import {getDb} from '$lib/server/db';
import * as table from '$lib/server/db/schema';

const CHALLENGE_COOKIE = 'passkey-challenge';
const CHALLENGE_TTL_SECONDS = 300;
const CHALLENGE_TTL_MS = CHALLENGE_TTL_SECONDS * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;

export type ChallengePurpose = 'authentication' | 'registration';

function hashChallengeToken(token: string): string {
    return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createChallenge(
    event: RequestEvent,
    challenge: string,
    purpose: ChallengePurpose,
    userId?: string
): Promise<void> {
    if (purpose === 'registration' && !userId) {
        throw new Error('Registration challenges require a userId');
    }
    if (purpose === 'authentication' && userId !== undefined) {
        throw new Error('Authentication challenges must not be bound to a userId');
    }

    const db = getDb();
    const now = new Date();
    await db.delete(table.webauthnChallenge).where(lt(table.webauthnChallenge.expiresAt, now));

    const token = encodeBase64url(crypto.getRandomValues(new Uint8Array(24)));
    const id = hashChallengeToken(token);
    const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);

    await db.insert(table.webauthnChallenge).values({
        id,
        challenge,
        purpose,
        userId: purpose === 'registration' ? userId! : null,
        expiresAt
    });

    event.cookies.set(CHALLENGE_COOKIE, token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: event.url.protocol === 'https:',
        maxAge: CHALLENGE_TTL_SECONDS
    });
}

export async function consumeChallenge(
    event: RequestEvent,
    purpose: ChallengePurpose,
    expectedUserId?: string
): Promise<string | null> {
    const token = event.cookies.get(CHALLENGE_COOKIE);
    event.cookies.delete(CHALLENGE_COOKIE, {path: '/'});

    if (!token || !TOKEN_PATTERN.test(token)) {
        return null;
    }

    if (purpose === 'registration' && !expectedUserId) {
        return null;
    }
    if (purpose === 'authentication' && expectedUserId !== undefined) {
        return null;
    }

    const db = getDb();
    const id = hashChallengeToken(token);
    const [row] = await db
        .delete(table.webauthnChallenge)
        .where(
            and(
                eq(table.webauthnChallenge.id, id),
                eq(table.webauthnChallenge.purpose, purpose),
                gt(table.webauthnChallenge.expiresAt, new Date()),
                expectedUserId
                    ? eq(table.webauthnChallenge.userId, expectedUserId)
                    : isNull(table.webauthnChallenge.userId)
            )
        )
        .returning({challenge: table.webauthnChallenge.challenge});

    return row?.challenge ?? null;
}
