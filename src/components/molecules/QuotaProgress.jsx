import { Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function QuotaProgress({ videosUsed, maxVideos }) {
    const quotaPercent = Math.min(
        100,
        Math.round((videosUsed / (maxVideos || 1)) * 100),
    );

    return (
        <div className="rounded-lg border border-slate-200/80 bg-white p-3 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Zap className="size-3 text-primary" />
                    Monthly Credits
                </span>
                <span className="font-semibold text-slate-900 text-xs">
                    {videosUsed}/{maxVideos}
                </span>
            </div>
            <Progress value={quotaPercent} className="h-1.5 bg-slate-100" />
        </div>
    );
}
