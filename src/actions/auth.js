import { ENDPOINTS } from "../constants/api.js";

function getAuthHeader() {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function loginAction({ email, password }) {
    const res = await fetch(ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed");
    }
    return data;
}

export async function registerAction({ name, email, password }) {
    const res = await fetch(ENDPOINTS.AUTH.REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed");
    }
    return data;
}

export async function logoutAction() {
    const res = await fetch(ENDPOINTS.AUTH.LOGOUT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
    });
    return res.json().catch(() => ({ success: true }));
}

export async function getMeAction() {
    const res = await fetch(ENDPOINTS.AUTH.ME, {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch current user");
    }
    return data.user;
}

export async function getUserKeysAction() {
    const res = await fetch(ENDPOINTS.AUTH.KEYS, {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch user keys");
    }
    return data;
}

export async function addUserKeyAction({ apiKey }) {
    const res = await fetch(ENDPOINTS.AUTH.KEYS, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
        body: JSON.stringify({ apiKey }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to add API key");
    }
    return data;
}

export async function removeUserKeyAction({ apiKey }) {
    const res = await fetch(ENDPOINTS.AUTH.KEYS, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
        body: JSON.stringify({ apiKey }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove API key");
    }
    return data;
}
