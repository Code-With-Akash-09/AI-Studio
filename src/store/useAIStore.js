import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export const useAIStore = create(
    immer((set) => ({
        // Auth Slice
        auth: {
            user: null,
            token:
                typeof window !== "undefined"
                    ? localStorage.getItem("accessToken")
                    : null,
            isAuthenticated: false,
        },
        setUser: (user) =>
            set((state) => {
                state.auth.user = user;
                state.auth.isAuthenticated = Boolean(user);
            }),
        setToken: (token) =>
            set((state) => {
                state.auth.token = token;
                if (token && typeof window !== "undefined") {
                    localStorage.setItem("accessToken", token);
                    document.cookie = `accessToken=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
                } else if (typeof window !== "undefined") {
                    localStorage.removeItem("accessToken");
                    document.cookie =
                        "accessToken=; path=/; max-age=0; SameSite=Lax";
                }
            }),
        logout: () =>
            set((state) => {
                state.auth.user = null;
                state.auth.token = null;
                state.auth.isAuthenticated = false;
                if (typeof window !== "undefined") {
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                    document.cookie =
                        "accessToken=; path=/; max-age=0; SameSite=Lax";
                }
            }),

        // Generator / Studio Slice
        generator: {
            script: "",
            provider: "gemini",
            dimension: "vertical",
            gender: "male",
            language: "",
            geminiKey: "",
            bgmMood: "auto",
            bgmVolume: 0.1,
            progress: 0,
            progressMsg: "",
            isGenerating: false,
            activeJobId: null,
            lastResult: null,
        },
        setScript: (script) =>
            set((state) => {
                state.generator.script = script;
            }),
        setProvider: (provider) =>
            set((state) => {
                state.generator.provider = provider;
            }),
        setDimension: (dimension) =>
            set((state) => {
                state.generator.dimension = dimension;
            }),
        setGender: (gender) =>
            set((state) => {
                state.generator.gender = gender;
            }),
        setLanguage: (language) =>
            set((state) => {
                state.generator.language = language;
            }),
        setGeminiKey: (key) =>
            set((state) => {
                state.generator.geminiKey = key;
            }),
        setBgmMood: (bgmMood) =>
            set((state) => {
                state.generator.bgmMood = bgmMood;
            }),
        setBgmVolume: (bgmVolume) =>
            set((state) => {
                state.generator.bgmVolume = bgmVolume;
            }),
        setGenerationProgress: ({ progress, message, jobId }) =>
            set((state) => {
                if (progress !== undefined) state.generator.progress = progress;
                if (message !== undefined)
                    state.generator.progressMsg = message;
                if (jobId !== undefined) state.generator.activeJobId = jobId;
            }),
        setGenerating: (isGenerating) =>
            set((state) => {
                state.generator.isGenerating = isGenerating;
            }),
        setLastResult: (result) =>
            set((state) => {
                state.generator.lastResult = result;
            }),
        resetGenerator: () =>
            set((state) => {
                state.generator.progress = 0;
                state.generator.progressMsg = "";
                state.generator.isGenerating = false;
                state.generator.activeJobId = null;
                state.generator.lastResult = null;
                state.generator.bgmMood = "auto";
                state.generator.bgmVolume = 0.1;
            }),

        // UI & Sidebar Slice
        ui: {
            sidebarOpen: true,
            activeModal: null,
        },
        setSidebarOpen: (open) =>
            set((state) => {
                state.ui.sidebarOpen = open;
            }),
        setActiveModal: (modal) =>
            set((state) => {
                state.ui.activeModal = modal;
            }),
    })),
);
