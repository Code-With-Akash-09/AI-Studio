"use client";
import { SceneBadge } from "@/components/atoms/SceneBadge.jsx";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Camera,
    Image as ImageIcon,
    Sparkles,
    Type,
    Video,
} from "lucide-react";

function getVisualIcon(visualType) {
    if (visualType === "image" || visualType === "synthesized_image")
        return ImageIcon;
    if (visualType === "text") return Type;
    return Video;
}

export function SceneCard({
    scene,
    index,
    selected = false,
    onSelect,
    compact = false,
}) {
    const visualType = scene.visualType || "video";
    const VisualIcon = getVisualIcon(visualType);
    const isSynthesized =
        visualType === "synthesized_image" ||
        scene.source === "flux_synthesized";

    return (
        <Card
            className={`gap-0 border-slate-200/80 bg-white p-0 shadow-2xs overflow-hidden flex flex-col justify-between lg:min-w-56 lg:flex-1 transition-all ${selected ? "border-primary ring-2 ring-primary/20" : "hover:border-slate-300"} ${compact ? "cursor-pointer" : ""}`}
            onClick={onSelect}
            onKeyDown={(event) => {
                if (onSelect && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onSelect();
                }
            }}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
        >
            <CardHeader className="py-2.5 px-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <SceneBadge index={index + 1} />
                    <span className="text-xs font-bold text-slate-900">
                        Scene {scene.id || index + 1}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {isSynthesized ? (
                        <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 bg-purple-50 border-purple-200 text-purple-700 font-semibold"
                        >
                            <Sparkles className="size-2.5 mr-1 text-purple-600" />
                            AI Frame
                        </Badge>
                    ) : (
                        <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 bg-white border-slate-200 text-slate-600 font-medium capitalize"
                        >
                            <VisualIcon className="size-2.5 mr-1 text-slate-500" />
                            {visualType}
                        </Badge>
                    )}

                    {scene.matchScore && (
                        <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-4 font-mono font-medium ${scene.matchScore >= 80 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}
                        >
                            {scene.matchScore}%
                        </Badge>
                    )}

                    {scene.duration && (
                        <span className="text-[11px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200/60">
                            {Number(scene.duration).toFixed(1)}s
                        </span>
                    )}
                </div>
            </CardHeader>

            {scene.assetUrl && visualType !== "text" && (
                <div className="aspect-video w-full overflow-hidden bg-slate-950 relative group">
                    {visualType === "video" || visualType === "gif" ? (
                        <video
                            src={scene.assetUrl}
                            muted
                            loop
                            autoPlay
                            playsInline
                            controls={!compact}
                            className="size-full object-cover"
                        />
                    ) : (
                        // biome-ignore lint/performance/noImgElement: Asset URLs come from external media providers.
                        <img
                            src={scene.assetUrl}
                            alt={`Scene ${scene.id || index + 1} visual`}
                            loading="lazy"
                            className="size-full object-cover"
                        />
                    )}
                </div>
            )}

            <CardContent
                className={`${compact ? "p-3" : "p-3.5"} space-y-2.5 flex-1 flex flex-col justify-between`}
            >
                {/* Narration */}
                <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Narration Dialogue
                    </span>
                    <p
                        className={`${compact ? "line-clamp-2" : ""} text-xs text-slate-800 leading-relaxed bg-slate-50/70 p-2 rounded-md border border-slate-100`}
                    >
                        &quot;{scene.narration}&quot;
                    </p>
                </div>

                {/* Directorial Visual Brief */}
                {scene.visualBrief && !compact && (
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1">
                            <Camera className="size-3" />
                            Visual Brief
                        </span>
                        <p className="text-[11px] text-slate-600 leading-normal bg-indigo-50/40 p-2 rounded border border-indigo-100/60">
                            {scene.visualBrief}
                        </p>
                    </div>
                )}

                {/* Directorial Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {scene.cameraShot && (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize">
                            🎬 {scene.cameraShot.replace("_", " ")}
                        </span>
                    )}

                    {scene.lightingMood && (
                        <span className="text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded capitalize">
                            💡 {scene.lightingMood.replace("_", " ")}
                        </span>
                    )}

                    {scene.emotion && (
                        <span className="text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded capitalize">
                            🎭 {scene.emotion}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
