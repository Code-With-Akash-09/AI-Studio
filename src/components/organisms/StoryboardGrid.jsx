"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Clock3,
    CopyPlus,
    Film,
    Image as ImageIcon,
    Layers3,
    Type,
    Video,
} from "lucide-react";
import { useEffect, useState } from "react";

function ScenePreview({ scene, index }) {
    const visualType = scene.visualType || "video";

    if (!scene.assetUrl || visualType === "text") {
        return (
            <div className="flex size-full flex-col items-center justify-center gap-3 bg-slate-950 p-8 text-center text-slate-400">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-slate-300">
                    <Type className="size-7" />
                </div>
                <span className="text-xs font-medium">
                    Text-based scene {index + 1}
                </span>
            </div>
        );
    }

    if (visualType === "video" || visualType === "gif") {
        return (
            <video
                src={scene.assetUrl}
                muted
                loop
                autoPlay
                playsInline
                controls
                className="size-full object-contain"
            />
        );
    }

    return (
        // biome-ignore lint/performance/noImgElement: Asset URLs are external provider URLs.
        <img
            src={scene.assetUrl}
            alt={`Scene ${scene.id || index + 1} preview`}
            className="size-full object-contain"
        />
    );
}

export function StoryboardGrid({ scenes = [], video = null }) {
    const [editableScenes, setEditableScenes] = useState(scenes);
    const [programVideoError, setProgramVideoError] = useState(false);
    const [selectedSceneId, setSelectedSceneId] = useState(
        scenes[0] ? scenes[0].id || "scene-0" : null,
    );
    const [addSceneOpen, setAddSceneOpen] = useState(false);
    const [draftScene, setDraftScene] = useState({
        narration: "",
        duration: "5",
        visualType: "text",
        assetUrl: "",
    });

    useEffect(() => {
        setEditableScenes(scenes);
    }, [scenes]);

    useEffect(() => {
        setProgramVideoError(false);
    }, [video?.videoUrl]);

    useEffect(() => {
        const openAddScene = () => setAddSceneOpen(true);
        window.addEventListener("open-add-scene", openAddScene);
        return () => window.removeEventListener("open-add-scene", openAddScene);
    }, []);

    const activeIndex = Math.max(
        0,
        editableScenes.findIndex(
            (scene, index) =>
                (scene.id || `scene-${index}`) === selectedSceneId,
        ),
    );
    const selectedScene = editableScenes[activeIndex] || editableScenes[0];

    function updateSelectedScene(field, value) {
        setEditableScenes((currentScenes) =>
            currentScenes.map((scene, index) =>
                index === activeIndex ? { ...scene, [field]: value } : scene,
            ),
        );
    }

    function addScene() {
        const nextIndex = editableScenes.length;
        const scene = {
            id: `scene-${nextIndex + 1}`,
            narration: draftScene.narration || "New scene narration",
            duration: Number(draftScene.duration) || 5,
            visualType: draftScene.visualType,
            ...(draftScene.assetUrl.trim() && {
                assetUrl: draftScene.assetUrl.trim(),
            }),
        };
        setEditableScenes((currentScenes) => [...currentScenes, scene]);
        setSelectedSceneId(scene.id);
        setDraftScene({
            narration: "",
            duration: "5",
            visualType: "text",
            assetUrl: "",
        });
        setAddSceneOpen(false);
    }

    return (
        <div
            id="storyboard-editor"
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
            <Dialog open={addSceneOpen} onOpenChange={setAddSceneOpen}>
                <DialogContent className="max-w-md rounded-lg!">
                    <DialogHeader>
                        <DialogTitle>Add scene to timeline</DialogTitle>
                        <DialogDescription>
                            Add another editable screen to this storyboard.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="new-scene-narration">
                                Narration
                            </Label>
                            <Textarea
                                id="new-scene-narration"
                                value={draftScene.narration}
                                onChange={(event) =>
                                    setDraftScene((draft) => ({
                                        ...draft,
                                        narration: event.target.value,
                                    }))
                                }
                                placeholder="Describe what this scene should say..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="new-scene-duration">
                                    Duration (seconds)
                                </Label>
                                <Input
                                    id="new-scene-duration"
                                    type="number"
                                    min="1"
                                    value={draftScene.duration}
                                    onChange={(event) =>
                                        setDraftScene((draft) => ({
                                            ...draft,
                                            duration: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Visual type</Label>
                                <Select
                                    value={draftScene.visualType}
                                    onValueChange={(value) =>
                                        setDraftScene((draft) => ({
                                            ...draft,
                                            visualType: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-full rounded-lg">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className={"rounded-lg"}>
                                        <SelectItem
                                            value="text"
                                            className="rounded-lg"
                                        >
                                            Text screen
                                        </SelectItem>
                                        <SelectItem
                                            value="image"
                                            className="rounded-lg"
                                        >
                                            Image
                                        </SelectItem>
                                        <SelectItem
                                            value="video"
                                            className="rounded-lg"
                                        >
                                            Video
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="new-scene-asset">
                                Asset URL (optional)
                            </Label>
                            <Input
                                id="new-scene-asset"
                                value={draftScene.assetUrl}
                                onChange={(event) =>
                                    setDraftScene((draft) => ({
                                        ...draft,
                                        assetUrl: event.target.value,
                                    }))
                                }
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose render={<Button variant="outline" />}>
                            Cancel
                        </DialogClose>
                        <Button onClick={addScene}>
                            <CopyPlus className="size-4" />
                            Add to Timeline
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {editableScenes.length === 0 ? (
                <Card className="border-slate-200 bg-white p-8 text-center shadow-2xs">
                    <p className="text-xs text-slate-500">
                        No individual scene checkpoints recorded for this video.
                    </p>
                </Card>
            ) : (
                <div className="grid min-h-0 flex-1 grid-cols-8 gap-6 overflow-hidden rounded-lg border-slate-300 bg-white p-6 shadow-sm">
                    <div className="col-span-1 flex min-h-0 flex-col overflow-hidden">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Media bin
                                </p>
                                <p className="text-sm font-semibold text-slate-900">
                                    {editableScenes.length} Clips
                                </p>
                            </div>
                            <Film className="size-4 text-primary" />
                        </div>
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-1">
                            {editableScenes.map((scene, index) => (
                                <Button
                                    key={scene.id || index}
                                    type="button"
                                    onClick={() =>
                                        setSelectedSceneId(
                                            scene.id || `scene-${index}`,
                                        )
                                    }
                                    variant="ghost"
                                    className={`h-auto flex flex-col w-full overflow-hidden rounded-lg border p-0 text-left gap-0! transition-colors hover:bg-white ${index === activeIndex ? "border-primary ring-1 ring-primary/20" : "border-slate-200 bg-white hover:border-primary/40"}`}
                                >
                                    <div className="flex aspect-video! w-full bg-slate-950 rounded-t-lg">
                                        {scene.assetUrl ? (
                                            scene.visualType === "video" ||
                                            scene.visualType === "gif" ? (
                                                <video
                                                    src={scene.assetUrl}
                                                    muted
                                                    playsInline
                                                    className="size-full object-cover rounded-t-lg"
                                                />
                                            ) : (
                                                // biome-ignore lint/performance/noImgElement: External scene asset URL.
                                                <img
                                                    src={scene.assetUrl}
                                                    alt={`Scene ${index + 1}`}
                                                    className="size-full object-cover rounded-t-lg"
                                                />
                                            )
                                        ) : (
                                            <div className="flex size-full items-center justify-center text-slate-500">
                                                <Type className="size-5" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 w-full px-2 py-1.5">
                                        <span className="truncate text-[11px] font-semibold text-slate-700">
                                            Scene {index + 1}
                                        </span>
                                        <span className="shrink-0 text-[10px] font-mono text-slate-400">
                                            {scene.duration
                                                ? `${Number(scene.duration).toFixed(1)}s`
                                                : "--"}
                                        </span>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="col-span-5 flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-800">
                        <div className="aspect-video min-h-65 w-full max-h-none flex-1">
                            {video?.videoUrl && !programVideoError ? (
                                <video
                                    src={video.videoUrl}
                                    controls
                                    preload="metadata"
                                    playsInline
                                    onError={() => setProgramVideoError(true)}
                                    className="size-full object-contain"
                                />
                            ) : (
                                <ScenePreview
                                    scene={selectedScene}
                                    index={activeIndex}
                                />
                            )}
                        </div>
                    </div>
                    <div className="col-span-2 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Active Scene
                                </p>
                                <h3 className="mt-1 text-base font-bold text-slate-900">
                                    Scene {selectedScene?.id || activeIndex + 1}
                                </h3>
                            </div>
                            <Badge variant="outline" className="capitalize">
                                {selectedScene?.visualType || "text"}
                            </Badge>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                    <Layers3 className="size-3.5 text-primary" />
                                    Narration
                                </Label>
                                <Textarea
                                    value={selectedScene?.narration || ""}
                                    onChange={(event) =>
                                        updateSelectedScene(
                                            "narration",
                                            event.target.value,
                                        )
                                    }
                                    className="min-h-28 resize-none bg-slate-50 text-sm leading-relaxed"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Duration</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={selectedScene?.duration || ""}
                                        onChange={(event) =>
                                            updateSelectedScene(
                                                "duration",
                                                Number(event.target.value),
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">
                                        Visual type
                                    </Label>
                                    <Select
                                        value={
                                            selectedScene?.visualType || "text"
                                        }
                                        onValueChange={(value) =>
                                            updateSelectedScene(
                                                "visualType",
                                                value,
                                            )
                                        }
                                        className={"rounded-lg"}
                                    >
                                        <SelectTrigger className="w-full rounded-lg!">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className={"rounded-lg"}>
                                            <SelectItem value="text">
                                                Text screen
                                            </SelectItem>
                                            <SelectItem value="image">
                                                Image
                                            </SelectItem>
                                            <SelectItem value="video">
                                                Video
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Asset URL</Label>
                                <Input
                                    value={selectedScene?.assetUrl || ""}
                                    onChange={(event) =>
                                        updateSelectedScene(
                                            "assetUrl",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Paste an image or video URL"
                                />
                            </div>
                            <div className="mt-auto grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-lg border border-slate-200 p-3">
                                    <span className="block text-slate-400">
                                        Duration
                                    </span>
                                    <span className="mt-1 flex items-center gap-1 font-semibold text-slate-800">
                                        <Clock3 className="size-3.5 text-primary" />
                                        {selectedScene?.duration
                                            ? `${Number(selectedScene.duration).toFixed(1)}s`
                                            : "--"}
                                    </span>
                                </div>
                                <div className="rounded-lg border border-slate-200 p-3">
                                    <span className="block text-slate-400">
                                        Asset
                                    </span>
                                    <span className="mt-1 flex items-center gap-1 font-semibold capitalize text-slate-800">
                                        {selectedScene?.visualType ===
                                        "image" ? (
                                            <ImageIcon className="size-3.5 text-primary" />
                                        ) : (
                                            <Video className="size-3.5 text-primary" />
                                        )}
                                        {selectedScene?.visualType || "text"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
