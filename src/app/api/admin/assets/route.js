import { NextResponse } from "next/server";
import {
    connectDB,
    getCollection,
    isDBConnected,
} from "../../../../lib/db/connection.js";
import { authenticate } from "../../../../lib/middlewares/auth.js";
import { requireRole } from "../../../../lib/middlewares/role.js";

export const runtime = "nodejs";

export async function GET(request) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const roleError = requireRole(authResult.user, "admin");
    if (roleError) return roleError;

    if (!isDBConnected()) {
        return NextResponse.json(
            { success: false, error: "Database not connected." },
            { status: 503 },
        );
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const type = searchParams.get("type") || "";

    try {
        const assetsCol = getCollection("assets");
        const skip = (Math.max(1, page) - 1) * limit;
        const query = type ? { type } : {};
        const [assets, total] = await Promise.all([
            assetsCol
                .find(query)
                .sort({ usageCount: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            assetsCol.countDocuments(query),
        ]);
        return NextResponse.json({
            success: true,
            assets,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("[Admin] Asset cache error:", error.message);
        return NextResponse.json(
            { success: false, error: "Failed to load asset cache." },
            { status: 500 },
        );
    }
}
