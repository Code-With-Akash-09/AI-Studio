import { ENDPOINTS } from "../constants/api.js";

function getAuthHeader() {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function generateVideoAction(payload) {
    const res = await fetch(ENDPOINTS.GENERATE, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        const error = new Error(data.error || "Video generation failed");
        if (data.jobId) error.jobId = data.jobId;
        throw error;
    }
    return data;
}

export async function getJobStatusAction(jobId) {
    if (!jobId) throw new Error("Job ID is required");
    const res = await fetch(ENDPOINTS.JOBS.STATUS(jobId), {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch job status");
    }
    return data;
}
