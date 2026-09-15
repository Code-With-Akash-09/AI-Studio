import { cn } from "@/lib/utils";

export function SceneBadge({ index, className }) {
    return (
        <span
            className={cn(
                "flex size-6 items-center justify-center rounded-md bg-primary text-white text-xs font-bold shrink-0",
                className,
            )}
        >
            {index}
        </span>
    );
}
