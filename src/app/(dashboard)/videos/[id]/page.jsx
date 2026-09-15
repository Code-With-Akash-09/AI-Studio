"use client";

import { StoryboardGrid } from "@/components/organisms/StoryboardGrid.jsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
    AlertCircle,
    ArrowLeft,
    Check,
    Copy,
    CopyPlus,
    Download,
    Edit3,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useVideoDelete, useVideoGet } from "../../../../hooks/useVideos.js";

export default function VideoDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [copied, setCopied] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const { data: video, isLoading } = useVideoGet(id);
    const deleteVideo = useVideoDelete();

    async function handleDelete() {
        try {
            await deleteVideo.mutateAsync(id);
            router.push("/videos");
        } catch {
            setDeleteDialogOpen(false);
            setDeleteError("Failed to delete video. Please try again.");
        }
    }

    function handleCopyScript() {
        if (!video?.script) return;
        navigator.clipboard.writeText(video.script);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (isLoading) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-32">
                <Spinner className="size-8 text-primary" />
                <p className="text-sm text-slate-500">Loading editor...</p>
            </div>
        );
    }

    if (!video) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center py-12">
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                    <AlertCircle className="size-5 shrink-0" />
                    <span className="text-sm font-semibold">
                        Video not found
                    </span>
                </div>
                <Button asChild variant="outline" className="mt-4">
                    <Link href="/videos">
                        <ArrowLeft className="mr-2 size-4" />
                        Back to Library
                    </Link>
                </Button>
            </div>
        );
    }

    const scenes = Array.isArray(video.scenes) ? video.scenes : [];

    return (
        <div className="flex h-screen min-h-0 flex-col gap-6 overflow-hidden bg-slate-100 p-4">
            {deleteError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {deleteError}
                </div>
            )}

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete this video?</DialogTitle>
                        <DialogDescription>
                            This removes the video record from your library.
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose render={<Button variant="outline" />}>
                            Cancel
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteVideo.isPending}
                        >
                            {deleteVideo.isPending
                                ? "Deleting..."
                                : "Delete Video"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button
                        asChild
                        variant="outline"
                        size="icon-sm"
                        className="text-slate-600"
                    >
                        <Link href="/videos">
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                    <div className="hidden h-6 w-px bg-slate-200 sm:block" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Video Editor
                        </p>
                        <h1 className="max-w-md truncate text-sm font-semibold text-slate-900">
                            {video.title || "Untitled project"}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="hidden sm:inline-flex">
                        {scenes.length} Scenes
                    </Badge>
                    <Button
                        size="sm"
                        onClick={() =>
                            window.dispatchEvent(new Event("open-add-scene"))
                        }
                    >
                        <CopyPlus className="mr-1.5 size-3.5" />
                        Add Scene
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            document
                                .getElementById("storyboard-editor")
                                ?.scrollIntoView({ behavior: "smooth" })
                        }
                    >
                        <Edit3 className="mr-1.5 size-3.5" />
                        Edit Timeline
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyScript}
                    >
                        {copied ? (
                            <Check className="mr-1.5 size-3.5 text-emerald-600" />
                        ) : (
                            <Copy className="mr-1.5 size-3.5" />
                        )}
                        {copied ? "Copied" : "Copy Script"}
                    </Button>
                    {video.videoUrl && (
                        <Button asChild size="sm">
                            <a
                                href={video.videoUrl}
                                download={video.filename || "ai-video.mp4"}
                            >
                                <Download className="mr-1.5 size-3.5" />
                                Export MP4
                            </a>
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => {
                            setDeleteError("");
                            setDeleteDialogOpen(true);
                        }}
                        title="Delete video record"
                    >
                        <Trash2 className="size-3.5 text-red-600" />
                    </Button>
                </div>
            </div>
            <StoryboardGrid scenes={scenes} video={video} />
        </div>
    );
}
