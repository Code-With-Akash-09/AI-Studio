"use client";
import { ScriptEditor } from "@/components/organisms/ScriptEditor.jsx";
import { StudioSettings } from "@/components/organisms/StudioSettings.jsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Download,
    FilePenLine,
    Film,
    RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { generateVideoAction } from "../../../actions/generate.js";
import { useSocket } from "../../../hooks/useSocket.js";

export default function GeneratePage() {
    const { socketId, lastProgress, connected } = useSocket();

    const [script, setScript] = useState("");
    const [provider, setProvider] = useState("gemini");
    const [dimension, setDimension] = useState("vertical");
    const [gender, setGender] = useState("male");
    const [language, setLanguage] = useState("hi");
    const [geminiKey, setGeminiKey] = useState("");

    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressMsg, setProgressMsg] = useState("");
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [resumeJobId, setResumeJobId] = useState(null);
    const [showScript, setShowScript] = useState(false);

    const videoRef = useRef(null);

    useEffect(() => {
        if (!lastProgress) return;
        if (lastProgress.progress !== undefined)
            setProgress(lastProgress.progress);
        if (lastProgress.message) setProgressMsg(lastProgress.message);
        if (lastProgress.error) setError(lastProgress.error);
        if (lastProgress.canResume && lastProgress.jobId)
            setResumeJobId(lastProgress.jobId);
    }, [lastProgress]);

    const handleGenerate = useCallback(
        async (e) => {
            e?.preventDefault();
            if (!script.trim() || script.trim().length < 10) {
                setError("Script must be at least 10 characters long.");
                return;
            }

            setLoading(true);
            setError("");
            setResult(null);
            setShowScript(false);
            setProgress(5);
            setProgressMsg("Initializing AI generation pipeline...");

            try {
                const body = {
                    script,
                    socketId,
                    provider,
                    dimension,
                    gender,
                    ...(language && { language }),
                    ...(geminiKey.trim() && { geminiApiKey: geminiKey.trim() }),
                    ...(resumeJobId && { jobId: resumeJobId }),
                };

                const data = await generateVideoAction(body);

                if (data.success) {
                    setResult(data);
                    setResumeJobId(null);
                    setProgress(100);
                    setProgressMsg("Video generated successfully! 🎉");
                } else {
                    setError(data.error || "Generation failed.");
                    if (data.jobId) setResumeJobId(data.jobId);
                }
            } catch (err) {
                setError(
                    err.message ||
                        "Network connection error. Please try again.",
                );
                if (err.jobId) setResumeJobId(err.jobId);
            } finally {
                setLoading(false);
            }
        },
        [
            script,
            socketId,
            provider,
            dimension,
            gender,
            language,
            geminiKey,
            resumeJobId,
        ],
    );

    const handleResume = useCallback(() => {
        setError("");
        handleGenerate();
    }, [handleGenerate]);

    return (
        <div className="flex min-h-0 flex-1 flex-col space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    AI Video Generator
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Transform text scripts into short-form videos with
                    narration, synchronized imagery, and animated subtitles.
                </p>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8 flex flex-1 flex-col space-y-5">
                    {loading ? (
                        <Card className="border-primary/20 bg-primary/5 h-full flex flex-col justify-center">
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between text-sm font-semibold">
                                    <div className="flex items-center gap-2 text-slate-900">
                                        <Spinner className="size-4 text-primary" />
                                        <span>
                                            {progressMsg ||
                                                "Generating video..."}
                                        </span>
                                    </div>
                                    <span className="text-primary font-mono">
                                        {progress}%
                                    </span>
                                </div>
                                <Progress
                                    value={progress}
                                    className="h-3 bg-primary/15"
                                />
                                <p className="text-xs text-slate-500">
                                    Your script is being transformed into
                                    narration, visuals, and captions.
                                </p>
                            </CardContent>
                        </Card>
                    ) : result && !showScript ? (
                        <Card className="h-full flex flex-col justify-center">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-800">
                                    <CheckCircle2 className="size-4 text-emerald-600" />
                                    <span className="text-sm font-semibold">
                                        Video Ready
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowScript(true)}
                                        className="h-8 px-3 text-xs font-semibold"
                                    >
                                        <FilePenLine className="size-3.5 mr-1.5" />
                                        Review Script
                                    </Button>
                                    <Button
                                        asChild
                                        size="sm"
                                        className="h-8 px-3 text-xs font-semibold shadow-2xs"
                                    >
                                        <a
                                            id="download-btn"
                                            href={result?.videoUrl}
                                            download={
                                                result?.filename ||
                                                "ai-video.mp4"
                                            }
                                        >
                                            <Download className="size-3.5 mr-1.5" />
                                            Download MP4
                                        </a>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative w-full h-[clamp(240px,55vh,460px)] min-h-0 overflow-hidden rounded-lg bg-slate-950 flex items-center justify-center">
                                    <video
                                        ref={videoRef}
                                        src={result?.videoUrl}
                                        controls
                                        className="h-full w-full max-w-full object-contain"
                                    />
                                </div>

                                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                                    <Badge
                                        variant="outline"
                                        className="text-xs bg-slate-50"
                                    >
                                        {result?.dimension}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="text-xs bg-slate-50"
                                    >
                                        {result?.language || "en"}
                                    </Badge>
                                    {result?.duration && (
                                        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                            <Clock className="size-3 text-slate-400" />
                                            {result?.duration?.toFixed(1)}s
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3 flex-1">
                            <ScriptEditor value={script} onChange={setScript} />
                            {result && (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowScript(false)}
                                    className="w-full"
                                >
                                    <Film className="size-4 mr-2" />
                                    View Generated Video
                                </Button>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="size-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                            {resumeJobId && (
                                <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={handleResume}
                                    className="bg-white border-red-200 text-red-700 hover:bg-red-100/50 shrink-0"
                                >
                                    <RefreshCw className="size-3 mr-1" />
                                    Resume Job
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                <div className="lg:col-span-4 flex flex-col space-y-4">
                    <StudioSettings
                        dimension={dimension}
                        onDimensionChange={setDimension}
                        gender={gender}
                        onGenderChange={setGender}
                        provider={provider}
                        onProviderChange={setProvider}
                        language={language}
                        onLanguageChange={setLanguage}
                        geminiKey={geminiKey}
                        onGeminiKeyChange={setGeminiKey}
                        onGenerate={handleGenerate}
                        loading={loading}
                        scriptEmpty={!script.trim()}
                        connected={connected}
                    />
                </div>
            </div>
        </div>
    );
}
