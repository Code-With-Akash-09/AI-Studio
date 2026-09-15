"use client";

import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { useAIStore } from "@/store/useAIStore";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function AuthGuard({ children }) {
    const { user, loading } = useAuth();
    const token = useAIStore((s) => s.auth.token);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isReady, setIsReady] = useState(false);

    const redirectParam =
        searchParams.get("redirect") || searchParams.get("from");
    const targetDashboard = redirectParam || ROUTES.STUDIO;

    useEffect(() => {
        if (user) {
            router.replace(targetDashboard);
            return;
        }

        if (!loading && !token) {
            setIsReady(true);
        }
    }, [user, loading, token, router, targetDashboard]);

    // Show loading spinner while checking auth or redirecting logged-in user
    if (user || (token && loading) || !isReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Spinner className="size-8 text-primary" />
            </div>
        );
    }

    return children;
}

export default function AuthLayout({ children }) {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <Spinner className="size-8 text-primary" />
                </div>
            }
        >
            <AuthGuard>{children}</AuthGuard>
        </Suspense>
    );
}
