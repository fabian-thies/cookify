import {clsx, type ClassValue} from "clsx";
import {twMerge} from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function validateUsername(username: unknown): username is string {
    return (
        typeof username === 'string' &&
        username.length >= 3 &&
        username.length <= 31 &&
        /^[a-zA-Z0-9_-]+$/.test(username)
    );
}

export function validatePassword(password: unknown): password is string {
    return (
        typeof password === 'string' &&
        password.length >= 6 &&
        password.length <= 255
    );
}

export function validateEmail(email: unknown): email is string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === 'string' && emailRegex.test(email);
}

const ASCII_CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function sanitizeRedirectPath(redirectTo: unknown, origin: string): string {
    if (typeof redirectTo !== 'string' || redirectTo.length === 0) {
        return '/';
    }

    if (
        ASCII_CONTROL_CHARS.test(redirectTo) ||
        redirectTo.includes('\\') ||
        !redirectTo.startsWith('/') ||
        redirectTo.startsWith('//')
    ) {
        return '/';
    }

    try {
        const base = new URL(origin);
        if (base.origin === 'null') {
            return '/';
        }

        const resolved = new URL(redirectTo, base);
        if (resolved.origin !== base.origin) {
            return '/';
        }

        const target = resolved.pathname + resolved.search + resolved.hash;
        if (!target.startsWith('/') || target.startsWith('//')) {
            return '/';
        }

        return target;
    } catch {
        return '/';
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
