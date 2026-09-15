import { NextResponse } from "next/server";
import { findUserById } from "../db/repositories/user.repository.js";
import { verifyAccessToken } from "../utils/jwt.js";

/**
 * Authenticate a Next.js API route request.
 * Returns { user } on success, or a NextResponse error.
 *
 * Usage:
 *   const authResult = await authenticate(request);
 *   if (authResult instanceof NextResponse) return authResult;
 *   const { user } = authResult;
 */
export async function authenticate(request) {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json(
            {
                success: false,
                error: "Authentication required. Please log in to continue.",
            },
            { status: 401 },
        );
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
        return NextResponse.json(
            { success: false, error: "Authentication token is missing." },
            { status: 401 },
        );
    }

    try {
        const decoded = verifyAccessToken(token);
        const user = await findUserById(decoded.id);

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User account not found or has been removed.",
                },
                { status: 401 },
            );
        }

        if (user.status === "suspended") {
            return NextResponse.json(
                {
                    success: false,
                    error: "Your account has been suspended. Please contact support.",
                },
                { status: 403 },
            );
        }

        return { user };
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return NextResponse.json(
                {
                    success: false,
                    error: "Session expired. Please log in again.",
                    code: "TOKEN_EXPIRED",
                },
                { status: 401 },
            );
        }

        return NextResponse.json(
            { success: false, error: "Invalid authentication token." },
            { status: 401 },
        );
    }
}
