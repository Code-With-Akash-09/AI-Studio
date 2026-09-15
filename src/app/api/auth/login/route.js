import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connection.js";
import {
    findUserByEmail,
    updateRefreshToken,
} from "../../../../lib/db/repositories/user.repository.js";
import {
    comparePassword,
    generateAccessToken,
    generateRefreshToken,
} from "../../../../lib/utils/jwt.js";

export const runtime = "nodejs";

export async function POST(request) {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
        return NextResponse.json(
            { success: false, error: "Email and password are required." },
            { status: 400 },
        );
    }

    try {
        const user = await findUserByEmail(email);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Invalid email or password." },
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

        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            return NextResponse.json(
                { success: false, error: "Invalid email or password." },
                { status: 401 },
            );
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        await updateRefreshToken(String(user._id), refreshToken);

        const response = NextResponse.json({
            success: true,
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                quota: user.quota,
                geminiApiKeys: user.geminiApiKeys || [],
            },
        });

        response.cookies.set("accessToken", accessToken, {
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });

        return response;
    } catch (error) {
        console.error("[Auth] Login error:", error.message);
        return NextResponse.json(
            { success: false, error: "Login failed. Please try again." },
            { status: 500 },
        );
    }
}
