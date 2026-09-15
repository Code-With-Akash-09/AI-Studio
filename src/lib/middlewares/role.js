import { NextResponse } from "next/server";

/**
 * Require one of the specified roles.
 * Returns null if OK, or a NextResponse error if role not satisfied.
 */
export function requireRole(user, ...roles) {
    if (!user) {
        return NextResponse.json(
            { success: false, error: "Authentication required." },
            { status: 401 },
        );
    }

    if (!roles.includes(user.role)) {
        return NextResponse.json(
            {
                success: false,
                error: `Access denied. Required role: [${roles.join(", ")}]. Your role: ${user.role}.`,
            },
            { status: 403 },
        );
    }

    return null;
}
