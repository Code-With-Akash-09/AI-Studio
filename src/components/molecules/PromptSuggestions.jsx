"use client";
import { Button } from "@/components/ui/button";
import { PROMPT_SUGGESTIONS } from "@/constants/prompts";
import { Lightbulb } from "lucide-react";

export function PromptSuggestions({ onSelect }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <Lightbulb className="size-3 text-amber-500" />
                <span>Try a sample script:</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {PROMPT_SUGGESTIONS.map((item) => (
                    <Button
                        key={item.label}
                        type="button"
                        onClick={() => onSelect(item.text)}
                        variant="outline"
                        size="sm"
                        className="text-xs px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 transition-colors font-medium text-left"
                    >
                        {item.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}
