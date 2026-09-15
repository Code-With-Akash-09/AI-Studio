import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connection.js";
import { listAllUsers } from "../../../../lib/db/repositories/user.repository.js";
import { authenticate } from "../../../../lib/middlewares/auth.js";
import { requireRole } from "../../../../lib/middlewares/role.js";

export const runtime = "nodejs";

export async function GET(request) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const roleError = requireRole(authResult.user, "admin");
    if (roleError) return roleError;

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const role = searchParams.get("role") || "";
    const search = searchParams.get("search") || "";

    try {
        const result = await listAllUsers({ page, limit, role, search });
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("[Admin] List users error:", error.message);
        return NextResponse.json(
            { success: false, error: "Failed to list users." },
            { status: 500 },
        );
    }
}
