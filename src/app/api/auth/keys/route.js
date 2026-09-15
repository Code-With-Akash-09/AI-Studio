import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connection.js";
import {
    addGeminiApiKey,
    getUserApiKeys,
    removeGeminiApiKey,
    updateUserApiKeys,
} from "../../../../lib/db/repositories/user.repository.js";
import { authenticate } from "../../../../lib/middlewares/auth.js";

export const runtime = "nodejs";

// GET /api/auth/keys
export async function GET(request) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    try {
        const keys = await getUserApiKeys(String(authResult.user._id));
        return NextResponse.json({
            success: true,
            geminiApiKeys: keys,
            count: keys.length,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "Failed to retrieve API keys." },
            { status: 500 },
        );
    }
}

// PUT /api/auth/keys — replace full list
export async function PUT(request) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const body = await request.json().catch(() => ({}));
    const { geminiApiKeys } = body;
    if (!Array.isArray(geminiApiKeys)) {
        return NextResponse.json(
            { success: false, error: "geminiApiKeys must be an array." },
            { status: 400 },
        );
    }
    try {
        const updatedKeys = await updateUserApiKeys(
            String(authResult.user._id),
            geminiApiKeys,
        );
        return NextResponse.json({
            success: true,
            message: "Keys updated.",
            geminiApiKeys: updatedKeys,
            count: updatedKeys.length,
        });
    } catch {
        return NextResponse.json(
            { success: false, error: "Failed to update API keys." },
            { status: 500 },
        );
    }
}

// POST /api/auth/keys — add single key
export async function POST(request) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const body = await request.json().catch(() => ({}));
    const { apiKey } = body;
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
        return NextResponse.json(
            { success: false, error: "apiKey is required." },
            { status: 400 },
        );
    }
    try {
        const updatedKeys = await addGeminiApiKey(
            String(authResult.user._id),
            apiKey.trim(),
        );
        return NextResponse.json({
            success: true,
            message: "Key added.",
            geminiApiKeys: updatedKeys,
            count: updatedKeys.length,
        });
    } catch {
        return NextResponse.json(
            { success: false, error: "Failed to add API key." },
            { status: 500 },
        );
    }
}

// DELETE /api/auth/keys — remove single key
export async function DELETE(request) {
    await connectDB();
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const body = await request.json().catch(() => ({}));
    const { apiKey } = body;
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
        return NextResponse.json(
            { success: false, error: "apiKey is required to delete." },
            { status: 400 },
        );
    }
    try {
        const updatedKeys = await removeGeminiApiKey(
            String(authResult.user._id),
            apiKey.trim(),
        );
        return NextResponse.json({
            success: true,
            message: "Key removed.",
            geminiApiKeys: updatedKeys,
            count: updatedKeys.length,
        });
    } catch {
        return NextResponse.json(
            { success: false, error: "Failed to remove API key." },
            { status: 500 },
        );
    }
}
