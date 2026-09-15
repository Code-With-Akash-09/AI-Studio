import { NextResponse } from "next/server";
import { connectDB, isDBConnected } from "../../../../lib/db/connection.js";
import {
    createUser,
    findUserByEmail,
    updateRefreshToken,
} from "../../../../lib/db/repositories/user.repository.js";
import {
    generateAccessToken,
    generateRefreshToken,
} from "../../../../lib/utils/jwt.js";

export const runtime = "nodejs";

export async function POST(request) {
    await connectDB();

    if (!isDBConnected()) {
        return NextResponse.json(
            {
                success: false,
                error: "Database is not connected. Registration unavailable.",
            },
            { status: 503 },
        );
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, password } = body;

    if (!name || !email || !password) {
        return NextResponse.json(
            {
                success: false,
                error: "Name, email, and password are required.",
            },
            { status: 400 },
        );
    }

    if (password.length < 8) {
        return NextResponse.json(
            {
                success: false,
                error: "Password must be at least 8 characters.",
            },
            { status: 400 },
        );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return NextResponse.json(
            { success: false, error: "Invalid email address." },
            { status: 400 },
        );
    }

    try {
        const existing = await findUserByEmail(email);
        if (existing) {
            return NextResponse.json(
                {
                    success: false,
                    error: "An account with this email already exists.",
                },
                { status: 409 },
            );
        }

        const user = await createUser({ name, email, password, role: "user" });
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        await updateRefreshToken(String(user._id), refreshToken);

        const response = NextResponse.json(
            {
                success: true,
                message: "Account created successfully.",
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
            },
            { status: 201 },
        );

        response.cookies.set("accessToken", accessToken, {
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });

        return response;
    } catch (error) {
        console.error("[Auth] Register error:", error.message);
        return NextResponse.json(
            { success: false, error: "Registration failed. Please try again." },
            { status: 500 },
        );
    }
}
