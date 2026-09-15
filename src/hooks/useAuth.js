"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    loginAction,
    registerAction,
    logoutAction,
    getMeAction,
    getUserKeysAction,
    addUserKeyAction,
    removeUserKeyAction,
} from "../actions/auth.js";
import { useAIStore } from "../store/useAIStore.js";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuthMe() {
    const setUser = useAIStore((s) => s.setUser);
    const setToken = useAIStore((s) => s.setToken);
    const token = useAIStore((s) => s.auth.token);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedToken = localStorage.getItem("accessToken");
            if (savedToken) {
                if (!token) {
                    setToken(savedToken);
                } else if (!document.cookie.includes("accessToken=")) {
                    document.cookie = `accessToken=${encodeURIComponent(savedToken)}; path=/; max-age=604800; SameSite=Lax`;
                }
            }
        }
        setIsHydrated(true);
    }, [token, setToken]);

    const activeToken =
        token ||
        (typeof window !== "undefined"
            ? localStorage.getItem("accessToken")
            : null);

    const query = useQuery({
        queryKey: ["auth", "me", activeToken],
        queryFn: getMeAction,
        enabled: Boolean(activeToken),
        retry: false,
    });

    useEffect(() => {
        if (query.data) {
            setUser(query.data);
        } else if (query.isError) {
            setUser(null);
            setToken(null);
        }
    }, [query.data, query.isError, setUser, setToken]);

    const loading = !isHydrated || (Boolean(activeToken) && query.isLoading);

    return {
        user: query.data || null,
        loading,
        error: query.error,
        refetch: query.refetch,
    };
}

export function useAuthLogin() {
    const queryClient = useQueryClient();
    const setUser = useAIStore((s) => s.setUser);
    const setToken = useAIStore((s) => s.setToken);

    return useMutation({
        mutationFn: loginAction,
        onSuccess: (data) => {
            if (data.accessToken) {
                setToken(data.accessToken);
            }
            if (data.refreshToken && typeof window !== "undefined") {
                localStorage.setItem("refreshToken", data.refreshToken);
            }
            if (data.user) {
                setUser(data.user);
            }
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        },
    });
}

export function useAuthRegister() {
    const queryClient = useQueryClient();
    const setUser = useAIStore((s) => s.setUser);
    const setToken = useAIStore((s) => s.setToken);

    return useMutation({
        mutationFn: registerAction,
        onSuccess: (data) => {
            if (data.accessToken) {
                setToken(data.accessToken);
            }
            if (data.refreshToken && typeof window !== "undefined") {
                localStorage.setItem("refreshToken", data.refreshToken);
            }
            if (data.user) {
                setUser(data.user);
            }
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        },
    });
}

export function useAuthLogout() {
    const queryClient = useQueryClient();
    const logout = useAIStore((s) => s.logout);
    const router = useRouter();

    return useMutation({
        mutationFn: logoutAction,
        onSettled: () => {
            logout();
            queryClient.clear();
            router.push("/login");
        },
    });
}

export function useUserKeys() {
    const token = useAIStore((s) => s.auth.token);
    return useQuery({
        queryKey: ["auth", "keys", token],
        queryFn: getUserKeysAction,
        enabled: Boolean(token),
    });
}

export function useUserKeyAdd() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addUserKeyAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["auth", "keys"] });
        },
    });
}

export function useUserKeyRemove() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeUserKeyAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["auth", "keys"] });
        },
    });
}

// Backward compatibility alias for legacy useAuth calls
export function useAuth() {
    const { user, loading, refetch } = useAuthMe();
    const loginMutation = useAuthLogin();
    const registerMutation = useAuthRegister();
    const logoutMutation = useAuthLogout();

    return {
        user,
        loading,
        login: async (email, password) => {
            return loginMutation.mutateAsync({ email, password });
        },
        register: async (name, email, password) => {
            return registerMutation.mutateAsync({ name, email, password });
        },
        logout: async () => {
            return logoutMutation.mutateAsync();
        },
        refetch,
    };
}
