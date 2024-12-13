import jwt from 'jsonwebtoken';
import {env} from '$env/dynamic/private';

interface JwtPayload {
    userId: string;
    username: string;
    roles: string[];
}

export const signJWT = async (userId: string, username: string, roles: string[] = []): Promise<string> => {
    if (!env.SECRET_APP_KEY) {
        throw new Error('SECRET_APP_KEY is not defined');
    }

    const payload: JwtPayload = {
        userId: userId,
        username,
        roles
    };

    return jwt.sign(payload, env.SECRET_APP_KEY, {expiresIn: '7d'});
};

export const verifyJWT = async (token: string): Promise<JwtPayload> => {
    if (!env.SECRET_APP_KEY) {
        throw new Error('SECRET_APP_KEY is not defined');
    }

    try {
        return jwt.verify(token, env.SECRET_APP_KEY) as JwtPayload;
    } catch (err) {
        throw new Error('Invalid or expired token');
    }
};

export const decodeJWT = async (token: string): Promise<null | JwtPayload> => {
    const decoded = jwt.decode(token);
    return decoded as JwtPayload | null;
};
