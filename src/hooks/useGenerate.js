"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    generateVideoAction,
    getJobStatusAction,
} from "../actions/generate.js";

export function useVideoGenerate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: generateVideoAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["videos", "list"] });
            queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        },
    });
}

export function useJobStatus(jobId) {
    return useQuery({
        queryKey: ["jobs", "status", jobId],
        queryFn: () => getJobStatusAction(jobId),
        enabled: Boolean(jobId),
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data?.status === "completed" || data?.status === "failed") {
                return false;
            }
            return 2000;
        },
    });
}
