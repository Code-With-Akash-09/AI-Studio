"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    deleteVideoAction,
    getVideoByIdAction,
    getVideosAction,
} from "../actions/videos.js";

export function useVideosList({ page = 1, limit = 8, search = "" } = {}) {
    return useQuery({
        queryKey: ["videos", "list", { page, limit, search }],
        queryFn: () => getVideosAction({ page, limit, search }),
    });
}

export function useVideoGet(id) {
    return useQuery({
        queryKey: ["videos", "detail", id],
        queryFn: () => getVideoByIdAction(id),
        enabled: Boolean(id),
    });
}

export function useVideoDelete() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteVideoAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["videos", "list"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
        },
    });
}
