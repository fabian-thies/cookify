import type {JwtPayload} from "jsonwebtoken";

export interface JwtVerificationResult {
    isValid: boolean;
    payload?: JwtPayload;
}