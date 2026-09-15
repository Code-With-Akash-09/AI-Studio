import { ENDPOINTS } from "../constants/api.js";

function getAuthHeader() {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getVideosAction({
    page = 1,
    limit = 8,
    search = "",
} = {}) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
    });

    const res = await fetch(`${ENDPOINTS.VIDEOS.LIST}?${params.toString()}`, {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to list videos");
    }
    return data;
}

export async function getVideoByIdAction(id) {
    if (!id) throw new Error("Video ID is required");
    const res = await fetch(ENDPOINTS.VIDEOS.DETAIL(id), {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch video details");
    }
    return data.video;
}

export async function deleteVideoAction(id) {
    if (!id) throw new Error("Video ID is required");
    const res = await fetch(ENDPOINTS.VIDEOS.DELETE(id), {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete video");
    }
    return data;
}
