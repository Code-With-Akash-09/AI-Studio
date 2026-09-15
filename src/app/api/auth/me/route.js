import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connection.js";
import { authenticate } from "../../../../lib/middlewares/auth.js";

export const runtime = "nodejs";

export async function GET(request) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;
    return NextResponse.json({
        success: true,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            quota: user.quota,
            geminiApiKeys: user.geminiApiKeys || [],
            createdAt: user.createdAt,
        },
    });
}
