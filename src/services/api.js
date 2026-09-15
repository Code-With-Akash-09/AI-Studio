const BASE_URL = "";

function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
}

async function request(path, options = {}) {
    const token = getToken();
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
    });

    const data = await res.json().catch(() => ({}));

    // Auto refresh token on 401
    if (res.status === 401 && data.code === "TOKEN_EXPIRED") {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            const newToken = getToken();
            const retryRes = await fetch(`${BASE_URL}${path}`, {
                ...options,
                headers: { ...headers, Authorization: `Bearer ${newToken}` },
            });
            return retryRes.json().catch(() => ({}));
        }
    }

    return data;
}

async function tryRefreshToken() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return false;

    const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json().catch(() => ({}));
    if (data.success && data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        return true;
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    return false;
}

export const api = {
    auth: {
        register: (data) =>
            request("/api/auth/register", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        login: (data) =>
            request("/api/auth/login", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        me: () => request("/api/auth/me"),
        logout: () => request("/api/auth/logout", { method: "POST" }),
        getKeys: () => request("/api/auth/keys"),
        addKey: (apiKey) =>
            request("/api/auth/keys", {
                method: "POST",
                body: JSON.stringify({ apiKey }),
            }),
        removeKey: (apiKey) =>
            request("/api/auth/keys", {
                method: "DELETE",
                body: JSON.stringify({ apiKey }),
            }),
        updateKeys: (geminiApiKeys) =>
            request("/api/auth/keys", {
                method: "PUT",
                body: JSON.stringify({ geminiApiKeys }),
            }),
    },
    videos: {
        list: (params = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request(`/api/videos${qs ? `?${qs}` : ""}`);
        },
        get: (id) => request(`/api/videos/${id}`),
    },
    jobs: {
        get: (jobId) => request(`/api/jobs/${jobId}`),
    },
    generate: (data) =>
        request("/api/generate", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    admin: {
        dashboard: () => request("/api/admin/dashboard"),
        users: (params = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request(`/api/admin/users${qs ? `?${qs}` : ""}`);
        },
        updateUser: (id, data) =>
            request(`/api/admin/users/${id}`, {
                method: "PATCH",
                body: JSON.stringify(data),
            }),
        assets: (params = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request(`/api/admin/assets${qs ? `?${qs}` : ""}`);
        },
    },
};
