"use client";
import { PromptSuggestions } from "@/components/molecules/PromptSuggestions.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileCode } from "lucide-react";

export function ScriptEditor({ value, onChange }) {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileCode className="size-4 text-slate-400" />
                    <CardTitle className="text-sm font-semibold text-slate-900">
                        Script Content
                    </CardTitle>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                    {value.length} chars
                </span>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-4">
                <Textarea
                    id="script-input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Paste or type your video script here..."
                    className="w-full flex-1 min-h-55 resize-none bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm leading-relaxed p-3.5 focus-visible:ring-1"
                />
                <PromptSuggestions onSelect={onChange} />
            </CardContent>
        </Card>
    );
}
