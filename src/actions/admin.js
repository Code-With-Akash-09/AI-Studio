import { ENDPOINTS } from "../constants/api.js";

function getAuthHeader() {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getAdminDashboardAction() {
    const res = await fetch(ENDPOINTS.ADMIN.DASHBOARD, {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load admin dashboard");
    }
    return data;
}

export async function getAdminUsersAction({
    page = 1,
    limit = 20,
    search = "",
    role = "",
} = {}) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(role ? { role } : {}),
    });

    const res = await fetch(`${ENDPOINTS.ADMIN.USERS}?${params.toString()}`, {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load users");
    }
    return data;
}

export async function updateAdminUserAction({ id, ...updates }) {
    if (!id) throw new Error("User ID is required");
    const res = await fetch(ENDPOINTS.ADMIN.USER_UPDATE(id), {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
        body: JSON.stringify(updates),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update user");
    }
    return data.user;
}

export async function getAdminAssetsAction({
    page = 1,
    limit = 20,
    type = "",
} = {}) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(type ? { type } : {}),
    });

    const res = await fetch(`${ENDPOINTS.ADMIN.ASSETS}?${params.toString()}`, {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load cached assets");
    }
    return data;
}
