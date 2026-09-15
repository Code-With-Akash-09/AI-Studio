"use client";
import { QuotaProgress } from "@/components/molecules/QuotaProgress.jsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ADMIN_ITEMS, NAV_ITEMS } from "@/constants/navigation";
import {
    Flame,
    LogOut,
    Settings,
    ShieldAlert,
    Sparkles,
    Video,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON_MAP = {
    Sparkles,
    Video,
    Settings,
    ShieldAlert,
};

export function AppSidebar({ user, logout }) {
    const pathname = usePathname();
    const videosUsed = user?.quota?.videosGeneratedThisMonth || 0;
    const maxVideos = user?.quota?.maxVideosPerMonth || 30;

    return (
        <Sidebar className="border-r border-slate-200 bg-white">
            <SidebarHeader className="h-14 px-4 flex flex-row items-center border-b border-slate-200 bg-white">
                <Link href="/generate" className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white shadow-xs shrink-0">
                        <Flame className="size-4.5" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 leading-none">
                            AI Studio
                        </span>
                        <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 bg-slate-50 text-slate-600 border-slate-200 font-semibold"
                        >
                            v1.0
                        </Badge>
                    </div>
                </Link>
            </SidebarHeader>

            <SidebarContent className="px-3 py-4">
                <SidebarGroup>
                    <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2.5 mb-1.5">
                        Platform
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1">
                            {NAV_ITEMS.map(({ href, label, iconName }) => {
                                const Icon = ICON_MAP[iconName];
                                const active = pathname === href;
                                return (
                                    <SidebarMenuItem key={href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={active}
                                            className={`h-9 rounded-lg px-2.5 transition-colors ${
                                                active
                                                    ? "bg-primary/10 text-primary font-semibold hover:bg-primary/15"
                                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
                                            }`}
                                        >
                                            <Link
                                                href={href}
                                                className="flex items-center gap-2.5"
                                            >
                                                <Icon
                                                    className={`size-4 ${active ? "text-primary" : "text-slate-400"}`}
                                                />
                                                <span className="text-sm">
                                                    {label}
                                                </span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {user?.role === "admin" && (
                    <SidebarGroup className="mt-3">
                        <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2.5 mb-1.5">
                            Management
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-1">
                                {ADMIN_ITEMS.map(
                                    ({ href, label, iconName }) => {
                                        const Icon = ICON_MAP[iconName];
                                        const active = pathname === href;
                                        return (
                                            <SidebarMenuItem key={href}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={active}
                                                    className={`h-9 rounded-lg px-2.5 transition-colors ${
                                                        active
                                                            ? "bg-primary/10 text-primary font-semibold hover:bg-primary/15"
                                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
                                                    }`}
                                                >
                                                    <Link
                                                        href={href}
                                                        className="flex items-center gap-2.5"
                                                    >
                                                        <Icon
                                                            className={`size-4 ${active ? "text-primary" : "text-slate-400"}`}
                                                        />
                                                        <span className="text-sm">
                                                            {label}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    },
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter className="p-3 border-t border-slate-100 bg-slate-50/40 flex flex-col gap-3">
                <QuotaProgress videosUsed={videosUsed} maxVideos={maxVideos} />

                <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {user?.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-900 truncate">
                                    {user?.name || "Creator"}
                                </span>
                                {user?.role === "admin" && (
                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1 rounded">
                                        ADMIN
                                    </span>
                                )}
                            </div>
                            <span className="text-[11px] text-slate-400 truncate">
                                {user?.email}
                            </span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={logout}
                        title="Sign Out"
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 size-7 shrink-0 rounded-md"
                    >
                        <LogOut className="size-3.5" />
                    </Button>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
