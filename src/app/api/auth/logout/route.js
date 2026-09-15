import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connection.js";
import { updateRefreshToken } from "../../../../lib/db/repositories/user.repository.js";
import { authenticate } from "../../../../lib/middlewares/auth.js";

export const runtime = "nodejs";

export async function POST(request) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;

    try {
        await updateRefreshToken(String(authResult.user._id), null);
        const response = NextResponse.json({
            success: true,
            message: "Logged out successfully.",
        });
        response.cookies.delete("accessToken");
        return response;
    } catch (error) {
        console.error("[Auth] Logout error:", error.message);
        return NextResponse.json(
            { success: false, error: "Logout failed." },
            { status: 500 },
        );
    }
}
