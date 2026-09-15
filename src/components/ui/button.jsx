import { useRender } from "@base-ui/react/use-render";
import { mergeProps } from "@base-ui/react/merge-props";
import { cva } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs",
                outline:
                    "border-border bg-background hover:bg-muted hover:text-foreground text-foreground shadow-2xs",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-muted hover:text-foreground text-foreground",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-9 px-3.5",
                xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
                sm: "h-8 gap-1.5 px-3 text-xs",
                lg: "h-11 px-6 text-sm font-semibold",
                icon: "size-9",
                "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
                "icon-sm": "size-8",
                "icon-lg": "size-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

function Button({
    className,
    variant = "default",
    size = "default",
    asChild = false,
    render,
    children,
    ...props
}) {
    const finalRender = render || (asChild ? children : undefined);

    return useRender({
        defaultTagName: "button",
        props: mergeProps(
            {
                className: cn(buttonVariants({ variant, size, className })),
                children: asChild ? undefined : children,
            },
            props,
        ),
        render: finalRender,
        state: {
            slot: "button",
        },
    });
}

export { Button, buttonVariants };
