export const ROUTES = {
    HOME: "/",
    LOGIN: "/login",
    REGISTER: "/register",
    STUDIO: "/generate",
    VIDEOS: "/videos",
    VIDEO_DETAIL: (id) => `/videos/${id}`,
    SETTINGS: "/settings",
    ADMIN: "/admin",
};

export const AUTH_ROUTES = [ROUTES.LOGIN, ROUTES.REGISTER];

export const PROTECTED_ROUTES = [
    ROUTES.STUDIO,
    ROUTES.VIDEOS,
    ROUTES.SETTINGS,
    ROUTES.ADMIN,
];
