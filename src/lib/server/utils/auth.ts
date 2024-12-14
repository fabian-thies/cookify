import jwt from 'jsonwebtoken';
import {env} from '$env/dynamic/private';
import type {JwtVerificationResult} from "$lib/types/JwtVerificationResult";

interface JwtPayload {
    userId: string;
    username: string;
    email: string;
    roles: string[];
}

export const signJWT = async (userId: string, username: string, email: string, roles: string[] = []): Promise<string> => {
    if (!env.SECRET_APP_KEY) {
        throw new Error('SECRET_APP_KEY is not defined');
    }

    const payload: JwtPayload = {
        userId,
        username,
        email,
        roles
    };

    return jwt.sign(payload, env.SECRET_APP_KEY, {expiresIn: '7d'});
};

export const verifyJWT = async (token: string): Promise<JwtVerificationResult> => {
    if (!env.SECRET_APP_KEY) {
        throw new Error('SECRET_APP_KEY is not defined');
    }

    try {
        const jwtPayload = jwt.verify(token, env.SECRET_APP_KEY) as JwtPayload;
        return {isValid: true, payload: jwtPayload};
    } catch (err) {
        return {isValid: false};
    }
};

export const decodeJWT = async (token: string): Promise<null | JwtPayload> => {
    const decoded = jwt.decode(token);
    return decoded as JwtPayload | null;
};
