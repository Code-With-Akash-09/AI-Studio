import Link from "next/link";
import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/constants/routes.js";

export default function Logo({
    size = "default",
    showBadge = true,
    href = ROUTES.STUDIO,
}) {
    const isLg = size === "lg";
    return (
        <Link href={href} className="flex items-center gap-2.5">
            <div
                className={`flex items-center justify-center rounded-lg bg-primary text-white shadow-xs shrink-0 ${
                    isLg ? "size-10 rounded-2xl" : "size-8"
                }`}
            >
                <Flame className={isLg ? "size-5" : "size-4"} />
            </div>
            <div className="flex items-center gap-2">
                <span
                    className={`font-bold text-slate-900 leading-none ${isLg ? "text-2xl tracking-tight" : "text-sm"}`}
                >
                    AI Studio
                </span>
                {showBadge && (
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 bg-slate-50 text-slate-600 border-slate-200 font-semibold"
                    >
                        v1.0
                    </Badge>
                )}
            </div>
        </Link>
    );
}
