"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
    BGM_MOODS,
    BGM_VOLUMES,
    VOCAL_SPEEDS,
    VOCAL_TONES,
} from "@/constants/audio";
import {
    AI_PROVIDERS,
    LANGUAGES,
    VISUAL_ENGINES,
    VOICE_GENDERS,
} from "@/constants/models";
import {
    Clapperboard,
    Gauge,
    Key,
    Mic,
    Monitor,
    Music,
    Play,
    Sliders,
    Smartphone,
    Sparkles,
    Square,
    Volume2
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DIMENSION_OPTIONS = [
    { value: "vertical", label: "9:16 Reels", Icon: Smartphone },
    { value: "horizontal", label: "16:9 Landscape", Icon: Monitor },
];

export function StudioSettings({
    dimension,
    onDimensionChange,
    gender,
    onGenderChange,
    vocalTone = "auto",
    onVocalToneChange,
    speedMultiplier = 1.0,
    onSpeedMultiplierChange,
    provider,
    onProviderChange,
    language,
    onLanguageChange,
    visualEngine = "ai_realism",
    onVisualEngineChange,
    geminiKey,
    onGeminiKeyChange,
    bgmMood = "auto",
    onBgmMoodChange,
    bgmVolume = 0.1,
    onBgmVolumeChange,
    onGenerate,
    loading,
    scriptEmpty,
    connected,
}) {
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewPlaying, setPreviewPlaying] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handlePreviewVoice = async () => {
        if (previewPlaying && audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setPreviewPlaying(false);
            return;
        }

        setPreviewLoading(true);
        try {
            const res = await fetch("/api/tts/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language,
                    gender,
                    vocalTone,
                    speedMultiplier,
                }),
            });

            if (!res.ok) {
                throw new Error("Preview generation failed");
            }

            const blob = await res.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                setPreviewPlaying(false);
                audioRef.current = null;
            };

            audio.onerror = () => {
                setPreviewPlaying(false);
                audioRef.current = null;
            };

            await audio.play();
            setPreviewPlaying(true);
        } catch (err) {
            console.error("Voice preview error:", err);
        } finally {
            setPreviewLoading(false);
        }
    };

    const selectedProvider = AI_PROVIDERS.find(
        (option) => option.value === provider,
    );
    const selectedLanguage = LANGUAGES.find(
        (option) => option.value === language,
    );
    const selectedVisualEngine =
        VISUAL_ENGINES.find((option) => option.value === visualEngine) ||
        VISUAL_ENGINES[0];
    const selectedTone =
        VOCAL_TONES.find((option) => option.value === vocalTone) ||
        VOCAL_TONES[0];
    const selectedSpeed =
        VOCAL_SPEEDS.find(
            (option) => String(option.value) === String(speedMultiplier),
        ) || VOCAL_SPEEDS[1];
    const selectedMood = BGM_MOODS.find((option) => option.value === bgmMood);
    const selectedVolume =
        BGM_VOLUMES.find(
            (option) => String(option.value) === String(bgmVolume),
        ) || BGM_VOLUMES.find((option) => option.value === 0.1);

    return (
        <Card className="flex-1 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sliders className="size-4 text-slate-500" />
                    <CardTitle className="text-sm font-semibold text-slate-900">
                        Format &amp; Voice Settings
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="flex-1 space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                            Aspect Ratio
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                            {DIMENSION_OPTIONS.map(({ value, label, Icon }) => (
                                <Button
                                    key={value}
                                    type="button"
                                    onClick={() => onDimensionChange(value)}
                                    variant="outline"
                                    size="default"
                                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${dimension === value
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                >
                                    <Icon className="size-4" />
                                    <span>{label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-slate-700">
                                Voice Type &amp; Preview
                            </Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handlePreviewVoice}
                                disabled={previewLoading}
                                className="h-6 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 flex items-center gap-1"
                            >
                                {previewLoading ? (
                                    <>
                                        <Spinner className="size-3" />
                                        <span>Synthesizing...</span>
                                    </>
                                ) : previewPlaying ? (
                                    <>
                                        <Square className="size-3 fill-current text-rose-500" />
                                        <span className="text-rose-600 font-medium">Stop Preview</span>
                                    </>
                                ) : (
                                    <>
                                        <Play className="size-3 fill-current text-indigo-600" />
                                        <span className="font-medium">Listen Preview</span>
                                    </>
                                )}
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {VOICE_GENDERS.map((g) => (
                                <Button
                                    key={g.value}
                                    type="button"
                                    onClick={() => onGenderChange(g.value)}
                                    variant="outline"
                                    size="default"
                                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${gender === g.value
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                >
                                    <Volume2 className="size-3.5" />
                                    <span>{g.label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="vocal-tone-select"
                                className="text-xs font-semibold text-slate-700 flex items-center gap-1"
                            >
                                <Mic className="size-3 text-slate-400" />
                                <span>Voice Emotion Tone</span>
                            </Label>
                            <Select
                                value={vocalTone}
                                onValueChange={onVocalToneChange}
                            >
                                <SelectTrigger
                                    id="vocal-tone-select"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900"
                                >
                                    <SelectValue>
                                        {selectedTone?.label || "Dynamic Emotion (AI Match)"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="rounded-lg!">
                                    {VOCAL_TONES.map((t) => (
                                        <SelectItem
                                            key={t.value}
                                            value={t.value}
                                            className="rounded-lg! w-fit"
                                        >
                                            <div className="flex flex-col text-left">
                                                <span className="font-medium text-xs">
                                                    {t.label}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {t.description}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="vocal-speed-select"
                                className="text-xs font-semibold text-slate-700 flex items-center gap-1"
                            >
                                <Gauge className="size-3 text-slate-400" />
                                <span>Delivery Speed</span>
                            </Label>
                            <Select
                                value={String(speedMultiplier ?? 1.0)}
                                onValueChange={(val) =>
                                    onSpeedMultiplierChange?.(Number.parseFloat(val))
                                }
                            >
                                <SelectTrigger
                                    id="vocal-speed-select"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900"
                                >
                                    <SelectValue>
                                        {selectedSpeed?.label || "1.0x (Normal)"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="rounded-lg!">
                                    {VOCAL_SPEEDS.map((sp) => (
                                        <SelectItem
                                            key={sp.value}
                                            value={String(sp.value)}
                                            className="rounded-lg!"
                                        >
                                            {sp.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="provider-select"
                                className="text-xs font-semibold text-slate-700"
                            >
                                AI Model Engine
                            </Label>
                            <Select
                                value={provider}
                                onValueChange={onProviderChange}
                            >
                                <SelectTrigger
                                    id="provider-select"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900"
                                >
                                    <SelectValue>
                                        {selectedProvider?.label || provider}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className={"rounded-lg!"}>
                                    {AI_PROVIDERS.map((p) => (
                                        <SelectItem
                                            key={p.value}
                                            value={p.value}
                                            className={"rounded-lg!"}
                                        >
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="language-select"
                                className="text-xs font-semibold text-slate-700"
                            >
                                Target Language
                            </Label>
                            <Select
                                value={language}
                                onValueChange={onLanguageChange}
                            >
                                <SelectTrigger
                                    id="language-select"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900"
                                >
                                    <SelectValue>
                                        {selectedLanguage?.label || language}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className={"rounded-lg!"}>
                                    {LANGUAGES.map((l) => (
                                        <SelectItem
                                            key={l.value || "auto"}
                                            value={l.value}
                                            className={"rounded-lg!"}
                                        >
                                            {l.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="visual-engine-select"
                            className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                        >
                            <span className="flex items-center gap-1.5">
                                <Clapperboard className="size-3 text-slate-400" />
                                <span>Visual Generation Engine</span>
                            </span>
                            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                100% Free
                            </span>
                        </Label>
                        <Select
                            value={visualEngine}
                            onValueChange={onVisualEngineChange}
                        >
                            <SelectTrigger
                                id="visual-engine-select"
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900"
                            >
                                <SelectValue>
                                    {selectedVisualEngine?.label ||
                                        "AI Photorealism (Recommended)"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="rounded-lg!">
                                {VISUAL_ENGINES.map((eng) => (
                                    <SelectItem
                                        key={eng.value}
                                        value={eng.value}
                                        className="rounded-lg! w-fit"
                                    >
                                        <div className="flex flex-col text-left">
                                            <span className="font-medium text-xs">
                                                {eng.label}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {eng.description}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div
                            className={`space-y-1.5 ${bgmMood === "none" ? "col-span-2" : ""}`}
                        >
                            <Label
                                htmlFor="bgm-mood-select"
                                className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                            >
                                <span className="flex items-center gap-1.5 truncate">
                                    <Music className="size-3 text-slate-400 shrink-0" />
                                    <span className="truncate">
                                        Background Audio
                                    </span>
                                </span>
                            </Label>
                            <Select
                                value={bgmMood}
                                onValueChange={onBgmMoodChange}
                            >
                                <SelectTrigger
                                    id="bgm-mood-select"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900"
                                >
                                    <SelectValue>
                                        {selectedMood?.label ||
                                            "Auto (AI Storyline Match)"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="rounded-lg!">
                                    {BGM_MOODS.map((m) => (
                                        <SelectItem
                                            key={m.value}
                                            value={m.value}
                                            className="rounded-lg! w-fit"
                                        >
                                            <div className="flex flex-col text-left">
                                                <span className="font-medium text-xs">
                                                    {m.label}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {m.description}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {bgmMood !== "none" && (
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="bgm-volume-select"
                                    className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                                >
                                    <span className="flex items-center gap-1.5 truncate">
                                        <Volume2 className="size-3 text-slate-400 shrink-0" />
                                        <span className="truncate">
                                            Music Volume
                                        </span>
                                    </span>
                                </Label>
                                <Select
                                    value={String(bgmVolume ?? 0.1)}
                                    onValueChange={(val) =>
                                        onBgmVolumeChange(
                                            Number.parseFloat(val),
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="bgm-volume-select"
                                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900"
                                    >
                                        <SelectValue>
                                            {selectedVolume?.label ||
                                                "Subtle (10%)"}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg!">
                                        {BGM_VOLUMES.map((vol) => (
                                            <SelectItem
                                                key={vol.value}
                                                value={String(vol.value)}
                                                className="rounded-lg!"
                                            >
                                                {vol.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="gemini-key-input"
                            className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                        >
                            <Key className="size-3 text-slate-400" />
                            <span>Gemini Key Override (Optional)</span>
                        </Label>
                        <Input
                            id="gemini-key-input"
                            type="password"
                            placeholder="AIzaSy..."
                            value={geminiKey}
                            onChange={(e) => onGeminiKeyChange(e.target.value)}
                            className="h-8 text-xs bg-white border-slate-200"
                        />
                    </div>
                </div>
                <div>
                    <Button
                        id="generate-btn"
                        onClick={onGenerate}
                        size="lg"
                        disabled={loading || scriptEmpty || !connected}
                        className="w-full font-bold shadow-xs h-10 text-sm"
                    >
                        {loading ? (
                            <>
                                <Spinner className="size-4 mr-2" />
                                Generating Video...
                            </>
                        ) : !connected ? (
                            "Connecting..."
                        ) : (
                            <>
                                <Sparkles className="size-4 mr-2" />
                                Generate Video
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
