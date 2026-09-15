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
import { AI_PROVIDERS, LANGUAGES, VOICE_GENDERS } from "@/constants/models";
import {
    Key,
    Monitor,
    Sliders,
    Smartphone,
    Sparkles,
    Volume2,
} from "lucide-react";

const DIMENSION_OPTIONS = [
    { value: "vertical", label: "9:16 Reels", Icon: Smartphone },
    { value: "horizontal", label: "16:9 Landscape", Icon: Monitor },
];

export function StudioSettings({
    dimension,
    onDimensionChange,
    gender,
    onGenderChange,
    provider,
    onProviderChange,
    language,
    onLanguageChange,
    geminiKey,
    onGeminiKeyChange,
    onGenerate,
    loading,
    scriptEmpty,
    connected,
}) {
    const selectedProvider = AI_PROVIDERS.find(
        (option) => option.value === provider,
    );
    const selectedLanguage = LANGUAGES.find(
        (option) => option.value === language,
    );

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
                                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                                        dimension === value
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
                        <Label className="text-xs font-semibold text-slate-700">
                            Voice Type
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                            {VOICE_GENDERS.map((g) => (
                                <Button
                                    key={g.value}
                                    type="button"
                                    onClick={() => onGenderChange(g.value)}
                                    variant="outline"
                                    size="default"
                                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                                        gender === g.value
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
