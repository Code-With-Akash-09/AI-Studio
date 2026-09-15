import { config } from "../../../config.js";

const PEXELS_API_URL = "https://api.pexels.com";

export async function searchPexels(
    query,
    type = "image",
    orientation = "portrait",
    page = 1,
) {
    const apiKey = config.pexelsApiKey;

    if (!apiKey) {
        throw new Error("PEXELS_API_KEY is missing in configuration");
    }

    const safeOrientation =
        orientation === "landscape" ? "landscape" : "portrait";
    let url;

    if (type === "video") {
        url = `${PEXELS_API_URL}/videos/search?query=${encodeURIComponent(
            query,
        )}&orientation=${safeOrientation}&page=${page}&per_page=15`;
    } else {
        url = `${PEXELS_API_URL}/v1/search?query=${encodeURIComponent(
            query,
        )}&orientation=${safeOrientation}&page=${page}&per_page=15`;
    }

    const response = await fetch(url, {
        headers: {
            Authorization: apiKey,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pexels API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (type === "video") {
        return (data.videos || []).map((video) => {
            const files = Array.isArray(video.video_files)
                ? video.video_files
                : [];
            // Prefer HD or matching aspect video file
            const bestFile =
                files.find((f) => f.quality === "hd" && f.link) ||
                files.find((f) => f.width >= 1080 && f.link) ||
                files[0];

            return {
                type: "video",
                url: bestFile?.link || null,
                thumbnail: video.image,
                width: video.width,
                height: video.height,
                duration: video.duration,
                source: "pexels",
                sourceId: video.id,
            };
        });
    }

    return (data.photos || []).map((photo) => ({
        type: "image",
        url: photo.src?.large2x || photo.src?.large || photo.src?.original,
        thumbnail: photo.src?.medium,
        width: photo.width,
        height: photo.height,
        source: "pexels",
        sourceId: photo.id,
    }));
}
