import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

export default function DimensionBadge({ dimension, className = "" }) {
    const isHorizontal = dimension === "horizontal";
    return (
        <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-4 border-slate-200 text-slate-700 bg-white font-semibold uppercase tracking-wider ${className}`}
        >
            <Layers className="size-2.5 mr-1 text-slate-400" />
            {isHorizontal ? "16:9 Landscape" : "9:16 Reels"}
        </Badge>
    );
}
