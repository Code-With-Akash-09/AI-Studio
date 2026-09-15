"use client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBar({
    value,
    onChange,
    onSearch,
    placeholder = "Search...",
    className,
}) {
    return (
        <div className={`relative ${className ?? ""}`}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <Input
                id="search-input"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
                className="h-9 pl-8 text-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
            />
        </div>
    );
}
