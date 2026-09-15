"use client";
import { AppSidebar } from "@/components/organisms/AppSidebar.jsx";
import { DashboardHeader } from "@/components/organisms/DashboardHeader.jsx";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ROUTES } from "@/constants/routes.js";
import { useAuth } from "../../hooks/useAuth.js";

const PAGE_TITLES = {
    "/generate": "Studio Generator",
    "/videos": "My Video Library",
    "/settings": "Account Settings",
    "/admin": "Admin Console",
};

export default function DashboardLayout({ children }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !loading && !user) {
            const redirectParam = encodeURIComponent(pathname);
            router.replace(`${ROUTES.LOGIN}?redirect=${redirectParam}`);
        }
    }, [mounted, user, loading, pathname, router]);

    if (!mounted || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Spinner className="size-8 text-primary" />
            </div>
        );
    }

    if (!user) return null;

    const currentTitle = PAGE_TITLES[pathname] || "Dashboard";

    if (pathname.startsWith("/videos/")) {
        return (
            <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-100">
                {children}
            </main>
        );
    }

    return (
        <SidebarProvider defaultOpen={true}>
            <div className="flex min-h-screen w-full bg-slate-50/60">
                <AppSidebar user={user} logout={logout} />
                <SidebarInset className="flex-1 flex flex-col min-w-0">
                    <DashboardHeader title={currentTitle} />
                    <main className="flex min-h-0 flex-1 flex-col overflow-auto p-6 w-full">
                        {children}
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
