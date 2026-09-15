import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connection.js";
import {
    findUserByEmail,
    findUserById,
    updateRefreshToken,
} from "../../../../lib/db/repositories/user.repository.js";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from "../../../../lib/utils/jwt.js";

export const runtime = "nodejs";

export async function POST(request) {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const { refreshToken } = body;

    if (!refreshToken) {
        return NextResponse.json(
            { success: false, error: "Refresh token is required." },
            { status: 400 },
        );
    }

    try {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await findUserById(decoded.id);

        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found." },
                { status: 401 },
            );
        }

        const storedUser = await findUserByEmail(user.email);
        if (
            !storedUser?.refreshToken ||
            storedUser.refreshToken !== refreshToken
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Refresh token has been revoked. Please log in again.",
                },
                { status: 401 },
            );
        }

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        await updateRefreshToken(String(user._id), newRefreshToken);

        return NextResponse.json({
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (_error) {
        return NextResponse.json(
            {
                success: false,
                error: "Invalid or expired refresh token. Please log in again.",
            },
            { status: 401 },
        );
    }
}
