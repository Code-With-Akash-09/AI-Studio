"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getAdminDashboardAction,
    getAdminUsersAction,
    updateAdminUserAction,
    getAdminAssetsAction,
} from "../actions/admin.js";

export function useAdminDashboard() {
    return useQuery({
        queryKey: ["admin", "dashboard"],
        queryFn: getAdminDashboardAction,
    });
}

export function useAdminUsers({
    page = 1,
    limit = 20,
    search = "",
    role = "",
} = {}) {
    return useQuery({
        queryKey: ["admin", "users", { page, limit, search, role }],
        queryFn: () => getAdminUsersAction({ page, limit, search, role }),
    });
}

export function useAdminUserUpdate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateAdminUserAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
        },
    });
}

export function useAdminAssets({ page = 1, limit = 20, type = "" } = {}) {
    return useQuery({
        queryKey: ["admin", "assets", { page, limit, type }],
        queryFn: () => getAdminAssetsAction({ page, limit, type }),
    });
}
