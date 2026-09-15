"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
    Activity,
    AlertCircle,
    Check,
    CheckCircle2,
    Copy,
    Key,
    Plus,
    Trash2,
    User,
} from "lucide-react";
import { useState } from "react";
import {
    useAuth,
    useUserKeyAdd,
    useUserKeyRemove,
    useUserKeys,
} from "../../../hooks/useAuth.js";

export default function SettingsPage() {
    const { user } = useAuth();
    const { data: keysData } = useUserKeys();
    const addKey = useUserKeyAdd();
    const removeKey = useUserKeyRemove();

    const [newKey, setNewKey] = useState("");
    const [msg, setMsg] = useState({ type: "", text: "" });
    const [copiedIndex, setCopiedIndex] = useState(null);

    const keys = keysData?.geminiApiKeys || [];

    const flash = (type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg({ type: "", text: "" }), 4000);
    };

    const handleAddKey = async () => {
        if (!newKey.trim()) return;
        try {
            await addKey.mutateAsync({ apiKey: newKey.trim() });
            setNewKey("");
            flash("success", "API key added to your rotation pool.");
        } catch {
            flash("error", "Failed to add API key.");
        }
    };

    const handleRemoveKey = async (key) => {
        try {
            await removeKey.mutateAsync({ apiKey: key });
            flash("success", "API key removed.");
        } catch {
            flash("error", "Failed to remove API key.");
        }
    };

    const copyToClipboard = (key, idx) => {
        navigator.clipboard.writeText(key);
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const maskKey = (k) =>
        k.length > 12 ? `${k.slice(0, 8)}••••••••${k.slice(-4)}` : k;

    const videosUsed = user?.quota?.videosGeneratedThisMonth || 0;
    const maxVideos = user?.quota?.maxVideosPerMonth || 30;
    const quotaPercent = Math.min(
        100,
        Math.round((videosUsed / (maxVideos || 1)) * 100),
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Account &amp; Preferences
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Manage your creator profile, API key rotation, and
                    generation quota.
                </p>
            </div>

            {msg.text && (
                <div
                    className={`flex items-center gap-2 p-3.5 rounded-lg text-xs font-medium ${
                        msg.type === "error"
                            ? "bg-red-50 border border-red-200 text-red-700"
                            : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                    }`}
                >
                    {msg.type === "error" ? (
                        <AlertCircle className="size-4 shrink-0 text-red-600" />
                    ) : (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    )}
                    <span>{msg.text}</span>
                </div>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <User className="size-4 text-slate-400" />
                        <CardTitle className="text-sm font-semibold text-slate-900">
                            Creator Profile
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                        <div className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Full Name
                            </span>
                            <div className="text-sm font-semibold text-slate-900">
                                {user?.name || "Creator"}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Email Address
                            </span>
                            <div className="text-sm font-semibold text-slate-900 truncate">
                                {user?.email || "—"}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Account Type
                            </span>
                            <div>
                                <Badge
                                    variant="secondary"
                                    className="bg-slate-100 text-slate-700 font-medium"
                                >
                                    {user?.role === "admin"
                                        ? "Administrator"
                                        : "Standard Creator"}
                                </Badge>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Status
                            </span>
                            <div>
                                <Badge
                                    variant="secondary"
                                    className="bg-emerald-50 text-emerald-700 border-emerald-100"
                                >
                                    ● Active
                                </Badge>
                            </div>
                        </div>
                    </div>
                    {user?.quota && (
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/70 space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                <span className="flex items-center gap-1.5">
                                    <Activity className="size-3.5 text-primary" />
                                    Monthly Video Credit Pool
                                </span>
                                <span className="text-slate-900 font-mono">
                                    {videosUsed} / {maxVideos} videos (
                                    {quotaPercent}%)
                                </span>
                            </div>
                            <Progress
                                value={quotaPercent}
                                className="h-2 bg-slate-200"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Key className="size-4 text-slate-400" />
                        <CardTitle className="text-sm font-semibold text-slate-900">
                            Custom Gemini API Keys
                        </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-slate-500">
                        Supply your own Google Gemini API keys to increase
                        request rate limits. Keys rotate seamlessly during batch
                        render jobs.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <Input
                            id="new-api-key-input"
                            type="password"
                            placeholder="AIzaSy..."
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" && handleAddKey()
                            }
                            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-9 text-xs flex-1 font-mono"
                        />
                        <Button
                            id="add-key-btn"
                            onClick={handleAddKey}
                            disabled={addKey.isPending || !newKey.trim()}
                            size="sm"
                            className="h-9 px-3.5 font-semibold shadow-2xs shrink-0 text-xs cursor-pointer"
                        >
                            {addKey.isPending ? (
                                <Spinner className="size-3.5 mr-1.5" />
                            ) : (
                                <Plus className="size-3.5 mr-1" />
                            )}
                            Add Key
                        </Button>
                    </div>

                    {keys.length === 0 ? (
                        <div className="py-7 text-center text-xs text-slate-500 bg-slate-50/70 rounded-lg border border-dashed border-slate-200">
                            No custom API keys registered. Default shared
                            platform capacity is used.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {keys.map((key, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                                >
                                    <div className="font-mono font-medium text-slate-700 tracking-wider">
                                        {maskKey(key)}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                copyToClipboard(key, i)
                                            }
                                            className="size-7 cursor-pointer"
                                            title="Copy Key"
                                        >
                                            {copiedIndex === i ? (
                                                <Check className="size-3 text-emerald-600" />
                                            ) : (
                                                <Copy className="size-3" />
                                            )}
                                        </Button>
                                        <Button
                                            id={`remove-key-${i}`}
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => handleRemoveKey(key)}
                                            className="size-7 cursor-pointer"
                                            title="Remove Key"
                                        >
                                            <Trash2 className="size-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
