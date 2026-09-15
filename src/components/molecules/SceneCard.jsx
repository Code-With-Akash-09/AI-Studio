"use client";
import { SceneBadge } from "@/components/atoms/SceneBadge.jsx";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Image as ImageIcon, Search, Smile, Type, Video } from "lucide-react";

function getVisualIcon(visualType) {
    if (visualType === "image") return ImageIcon;
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

    return (
        <Card
            className={`gap-0 border-slate-200/80 bg-white p-0 shadow-2xs overflow-hidden flex flex-col justify-between lg:min-w-52 lg:flex-1 ${selected ? "border-primary ring-2 ring-primary/20" : ""} ${compact ? "cursor-pointer" : ""}`}
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
            <CardHeader className="py-3 px-4 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <SceneBadge index={index + 1} />
                    <span className="text-xs font-bold text-slate-900">
                        Scene {scene.id || index + 1}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 bg-white border-slate-200 text-slate-600 font-medium capitalize"
                    >
                        <VisualIcon className="size-2.5 mr-1 text-slate-500" />
                        {visualType}
                    </Badge>

                    {scene.duration && (
                        <span className="text-[11px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200/60">
                            {Number(scene.duration).toFixed(1)}s
                        </span>
                    )}
                </div>
            </CardHeader>

            {scene.assetUrl && visualType !== "text" && (
                <div className="aspect-video w-full overflow-hidden bg-slate-950">
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
                className={`${compact ? "p-3" : "p-4"} space-y-3 flex-1 flex flex-col justify-between`}
            >
                {/* Narration */}
                <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Narration Dialogue
                    </span>
                    <p
                        className={`${compact ? "line-clamp-2" : ""} text-xs text-slate-800 leading-relaxed bg-slate-50/60 p-2.5 rounded-md border border-slate-100`}
                    >
                        &quot;{scene.narration}&quot;
                    </p>
                </div>

                {/* Scene Metadata */}
                <div className="space-y-1.5 pt-1">
                    {scene.emotion && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-600">
                            <Smile className="size-3 text-amber-500 shrink-0" />
                            <span className="font-semibold text-slate-500 text-[10px]">
                                Emotion:
                            </span>
                            <span className="capitalize font-medium text-slate-700">
                                {scene.emotion}
                            </span>
                        </div>
                    )}

                    {scene.searchKeyword && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-600">
                            <Search className="size-3 text-primary shrink-0" />
                            <span className="font-semibold text-slate-500 text-[10px]">
                                Asset Query:
                            </span>
                            <span className="font-mono text-[11px] text-slate-700 truncate">
                                &quot;{scene.searchKeyword}&quot;
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
