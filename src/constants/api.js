export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const ENDPOINTS = {
    AUTH: {
        LOGIN: "/api/auth/login",
        REGISTER: "/api/auth/register",
        LOGOUT: "/api/auth/logout",
        ME: "/api/auth/me",
        REFRESH: "/api/auth/refresh",
        KEYS: "/api/auth/keys",
    },
    VIDEOS: {
        LIST: "/api/videos",
        DETAIL: (id) => `/api/videos/${id}`,
        DELETE: (id) => `/api/videos/${id}`,
    },
    GENERATE: "/api/generate",
    JOBS: {
        STATUS: (jobId) => `/api/jobs/${jobId}`,
    },
    ADMIN: {
        DASHBOARD: "/api/admin/dashboard",
        USERS: "/api/admin/users",
        USER_UPDATE: (id) => `/api/admin/users/${id}`,
        ASSETS: "/api/admin/assets",
    },
    HEALTH: "/api/health",
};
