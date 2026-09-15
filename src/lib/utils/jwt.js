import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt.
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain password against a bcrypt hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function comparePassword(password, hash) {
    if (!password || !hash) return false;
    return await bcrypt.compare(password, hash);
}

/**
 * Generate a short-lived JWT Access Token.
 * @param {Object} user - User document or payload
 * @returns {string}
 */
export function generateAccessToken(user) {
    const payload = {
        id: String(user._id || user.id),
        email: user.email,
        role: user.role || "user",
    };

    return jwt.sign(payload, config.jwtAccessSecret, {
        expiresIn: config.jwtAccessExpiresIn,
    });
}

/**
 * Generate a long-lived JWT Refresh Token.
 * @param {Object} user
 * @returns {string}
 */
export function generateRefreshToken(user) {
    const payload = {
        id: String(user._id || user.id),
        email: user.email,
    };

    return jwt.sign(payload, config.jwtRefreshSecret, {
        expiresIn: config.jwtRefreshExpiresIn,
    });
}

/**
 * Verify an Access Token.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export function verifyAccessToken(token) {
    return jwt.verify(token, config.jwtAccessSecret);
}

/**
 * Verify a Refresh Token.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export function verifyRefreshToken(token) {
    return jwt.verify(token, config.jwtRefreshSecret);
}
