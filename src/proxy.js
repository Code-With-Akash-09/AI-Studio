import { NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/register"];
const PROTECTED_PREFIXES = ["/generate", "/videos", "/settings", "/admin"];

export function proxy(request) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get("accessToken")?.value;

    const isAuthPage = AUTH_PAGES.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
    const isProtectedPage = PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

    // If user is already logged in and visits auth pages, redirect to dashboard
    if (isAuthPage && token) {
        return NextResponse.redirect(new URL("/generate", request.url));
    }

    // If unauthenticated user tries to access dashboard / protected pages, redirect to login
    if (isProtectedPage && !token) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export default proxy;

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public static files (.png, .jpg, .svg, etc.)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
    ],
};
