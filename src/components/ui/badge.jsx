import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
    "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-md border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all [&>svg]:size-3",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground",
                secondary: "bg-secondary text-secondary-foreground",
                destructive:
                    "bg-destructive/10 text-destructive border-destructive/20",
                outline: "border-border text-foreground bg-background",
                ghost: "hover:bg-muted hover:text-muted-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

function Badge({ className, variant = "default", render, ...props }) {
    return useRender({
        defaultTagName: "span",
        props: mergeProps(
            {
                className: cn(badgeVariants({ variant }), className),
            },
            props,
        ),
        render,
        state: {
            slot: "badge",
            variant,
        },
    });
}

export { Badge, badgeVariants };
