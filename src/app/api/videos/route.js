import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/db/connection.js";
import { listVideos } from "../../../lib/db/repositories/video.repository.js";
import { authenticate } from "../../../lib/middlewares/auth.js";

export const runtime = "nodejs";

export async function GET(request) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const search = searchParams.get("search") || "";

    const userId =
        user?.role === "admin"
            ? searchParams.get("userId") || null
            : String(user._id);

    try {
        const result = await listVideos({ page, limit, search, userId });
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("List videos error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to list videos." },
            { status: 500 },
        );
    }
}
