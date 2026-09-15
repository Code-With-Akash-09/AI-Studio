"use client";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader({ title }) {
    return (
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
                <SidebarTrigger className="text-slate-500 hover:text-slate-900 size-8 rounded-md" />
                <Separator
                    orientation="vertical"
                    className="h-4 bg-slate-200"
                />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {title}
                </span>
            </div>
        </header>
    );
}

export { SidebarInset };
