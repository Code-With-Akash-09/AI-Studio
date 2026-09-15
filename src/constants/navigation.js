import { ROUTES } from "./routes.js";

export const NAV_ITEMS = [
    { href: ROUTES.STUDIO, label: "Studio", iconName: "Sparkles" },
    { href: ROUTES.VIDEOS, label: "My Videos", iconName: "Video" },
    { href: ROUTES.SETTINGS, label: "Settings", iconName: "Settings" },
];

export const ADMIN_ITEMS = [
    { href: ROUTES.ADMIN, label: "Admin Console", iconName: "ShieldAlert" },
];

// Alias for backward compatibility
export const ADMIN_NAV_ITEMS = ADMIN_ITEMS;
