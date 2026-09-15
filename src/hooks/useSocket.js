"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export function useSocket() {
    const socketRef = useRef(null);
    const progressHandlersRef = useRef(new Set());
    const [socketId, setSocketId] = useState(null);
    const [connected, setConnected] = useState(false);
    const [lastProgress, setLastProgress] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        const socket = io(window.location.origin, {
            auth: token ? { token } : {},
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        const handleProgress = (payload) => {
            setLastProgress(payload);
        };
        socket.on("video:progress", handleProgress);

        for (const handler of progressHandlersRef.current) {
            socket.on("video:progress", handler);
        }

        socket.on("connect", () => {
            setSocketId(socket.id);
            setConnected(true);
        });

        socket.on("disconnect", () => {
            setConnected(false);
        });

        return () => {
            progressHandlersRef.current.clear();
            socket.off("video:progress", handleProgress);
            socket.disconnect();
        };
    }, []);

    const onProgress = useCallback((handler) => {
        const socket = socketRef.current;
        progressHandlersRef.current.add(handler);
        socket?.on("video:progress", handler);

        return () => {
            progressHandlersRef.current.delete(handler);
            socket?.off("video:progress", handler);
        };
    }, []);

    return {
        socket: socketRef.current,
        socketId,
        connected,
        lastProgress,
        onProgress,
    };
}
