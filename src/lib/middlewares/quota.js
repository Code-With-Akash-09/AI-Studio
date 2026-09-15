import { NextResponse } from "next/server";

/**
 * Check if the authenticated user has not exceeded their monthly quota.
 * Returns null if OK, or a NextResponse error if quota exceeded.
 */
export function checkVideoQuota(user) {
    if (!user || user.role === "admin") return null;

    const quota = user.quota || {};
    const generated = quota.videosGeneratedThisMonth || 0;
    const maxAllowed = quota.maxVideosPerMonth || 30;

    if (generated >= maxAllowed) {
        return NextResponse.json(
            {
                success: false,
                error: `Monthly quota exceeded. You have generated ${generated} of ${maxAllowed} videos this month.`,
                code: "QUOTA_EXCEEDED",
                quota: { used: generated, limit: maxAllowed },
            },
            { status: 429 },
        );
    }

    return null;
}
