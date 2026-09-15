import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";

function Input({ className, type, ...props }) {
    return (
        <InputPrimitive
            type={type}
            data-slot="input"
            className={cn(
                "h-9 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-1 text-sm text-foreground transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
}

export { Input };
