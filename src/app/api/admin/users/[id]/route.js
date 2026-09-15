import { NextResponse } from "next/server";
import { connectDB } from "../../../../../lib/db/connection.js";
import { updateUser } from "../../../../../lib/db/repositories/user.repository.js";
import { authenticate } from "../../../../../lib/middlewares/auth.js";
import { requireRole } from "../../../../../lib/middlewares/role.js";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const roleError = requireRole(authResult.user, "admin");
    if (roleError) return roleError;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { role, status, maxVideosPerMonth } = body;

    const allowed = {};

    if (role) {
        if (!["user", "admin"].includes(role)) {
            return NextResponse.json(
                { success: false, error: "Role must be 'user' or 'admin'." },
                { status: 400 },
            );
        }
        allowed.role = role;
    }

    if (status) {
        if (!["active", "suspended"].includes(status)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Status must be 'active' or 'suspended'.",
                },
                { status: 400 },
            );
        }
        allowed.status = status;
    }

    if (maxVideosPerMonth !== undefined) {
        allowed["quota.maxVideosPerMonth"] = Number(maxVideosPerMonth);
    }

    if (Array.isArray(body.geminiApiKeys)) {
        allowed.geminiApiKeys = [
            ...new Set(
                body.geminiApiKeys.map((k) => String(k).trim()).filter(Boolean),
            ),
        ];
    }

    if (String(authResult.user._id) === String(id)) {
        return NextResponse.json(
            {
                success: false,
                error: "You cannot modify your own account role or status.",
            },
            { status: 400 },
        );
    }

    try {
        await updateUser(id, allowed);
        return NextResponse.json({
            success: true,
            message: "User updated successfully.",
        });
    } catch (error) {
        console.error("[Admin] Update user error:", error.message);
        return NextResponse.json(
            { success: false, error: "Failed to update user." },
            { status: 500 },
        );
    }
}
