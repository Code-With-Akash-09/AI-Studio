import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connection.js";
import {
    getVideoById,
    deleteVideo,
} from "../../../../lib/db/repositories/video.repository.js";
import { authenticate } from "../../../../lib/middlewares/auth.js";

export const runtime = "nodejs";

export async function GET(request, { params }) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    try {
        const { id } = await params;
        const video = await getVideoById(id);
        if (!video) {
            return NextResponse.json(
                { success: false, error: "Video not found." },
                { status: 404 },
            );
        }
        if (
            user?.role !== "admin" &&
            String(video.userId) !== String(user._id)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "You do not have permission to view this video.",
                },
                { status: 403 },
            );
        }
        return NextResponse.json({ success: true, video });
    } catch (error) {
        console.error("Get video error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to get video." },
            { status: 500 },
        );
    }
}

export async function DELETE(request, { params }) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    try {
        const { id } = await params;
        const video = await getVideoById(id);
        if (!video) {
            return NextResponse.json(
                { success: false, error: "Video not found." },
                { status: 404 },
            );
        }
        if (
            user?.role !== "admin" &&
            String(video.userId) !== String(user._id)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "You do not have permission to delete this video.",
                },
                { status: 403 },
            );
        }
        const deleted = await deleteVideo(id);
        if (!deleted) {
            return NextResponse.json(
                { success: false, error: "Failed to delete video." },
                { status: 500 },
            );
        }
        return NextResponse.json({ success: true, message: "Video deleted." });
    } catch (error) {
        console.error("Delete video error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete video." },
            { status: 500 },
        );
    }
}
