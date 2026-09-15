import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, Film } from "lucide-react";
import Link from "next/link";

export function VideoCard({ video }) {
    const isHorizontal = video.dimension === "horizontal";
    const scenesCount = Array.isArray(video.scenes) ? video.scenes.length : 0;

    return (
        <Card className="group border-slate-200/80 bg-white shadow-2xs hover:shadow-xs hover:border-primary/40 transition-all duration-200 overflow-hidden flex flex-col p-0">
            <Link
                href={`/videos/${video._id}`}
                className="flex flex-col h-full"
            >
                <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                            <Film className="size-4" />
                        </div>
                        <Badge variant="outline">
                            {isHorizontal ? "16:9 Landscape" : "9:16 Reels"}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {scenesCount > 0 && (
                            <Badge variant="secondary">
                                {scenesCount}{" "}
                                {scenesCount === 1 ? "Scene" : "Scenes"}
                            </Badge>
                        )}
                    </div>
                </div>
                <CardContent className="p-4 flex flex-col flex-1 justify-between gap-3.5 bg-white">
                    <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                                {video.title || "AI Generated Video"}
                            </h3>
                            <ArrowUpRight className="size-4 text-slate-300 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                            {video.script ||
                                "AI generated video narration transcript."}
                        </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                            <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 border-slate-200 text-slate-600 bg-slate-50"
                            >
                                {video.language || "en"}
                            </Badge>
                            {video.voice && (
                                <span
                                    className="text-[10px] text-slate-400 truncate max-w-25"
                                    title={video.voice}
                                >
                                    {video.voice
                                        .replace("Neural", "")
                                        .replace("-", " ")}
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                            {new Date(video.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </CardContent>
            </Link>
        </Card>
    );
}
