import { cn } from "cn";

function Textarea({ className, ...props }) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                "flex min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
                className,
            )}
            {...props}
        />
    );
}

export { Textarea };
