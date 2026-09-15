"use client";
import { SearchBar } from "@/components/molecules/SearchBar.jsx";
import { VideoCard } from "@/components/molecules/VideoCard.jsx";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ChevronLeft, ChevronRight, Film, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useVideosList } from "../../../hooks/useVideos.js";

export default function VideosPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [committedSearch, setCommittedSearch] = useState("");

    const { data, isLoading } = useVideosList({
        page,
        limit: 8,
        search: committedSearch,
    });

    const videos = data?.videos || [];
    const total = data?.total || 0;

    function handleSearch() {
        setPage(1);
        setCommittedSearch(search);
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Video Library
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {total} video{total !== 1 ? "s" : ""} generated in your
                        workspace
                    </p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        onSearch={handleSearch}
                        placeholder="Search title or script..."
                        className="flex-1 sm:w-60"
                    />
                    <Button
                        asChild
                        size="sm"
                        className="h-9 px-3.5 text-xs font-semibold shadow-2xs shrink-0"
                    >
                        <Link href="/generate">
                            <Sparkles className="size-3.5 mr-1" />
                            Create Video
                        </Link>
                    </Button>
                </div>
            </div>
            {isLoading ? (
                <div className="flex flex-col flex-1 items-center justify-center py-24 gap-3">
                    <Spinner className="size-6 text-primary" />
                    <p className="text-xs text-slate-500">Loading library...</p>
                </div>
            ) : videos.length === 0 ? (
                <div className="flex flex-col flex-1 text-center items-center justify-center py-24 ">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 mb-3.5">
                        <Film className="size-6 text-slate-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                        No videos found
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
                        {committedSearch
                            ? "No videos match your search term. Try a different query or clear the filter."
                            : "Your library is empty. Generate your first AI video to populate your gallery."}
                    </p>
                    <div className="flex justify-center">
                        <Button
                            asChild
                            size="sm"
                            className="h-9 px-4 text-xs font-semibold shadow-2xs"
                        >
                            <Link href="/generate">
                                <Sparkles className="size-3.5 mr-1.5" />
                                Generate Video
                            </Link>
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col flex-1">
                    <div className="flex-1 grid grid-cols-1 grid-rows-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {videos.map((v) => (
                            <VideoCard key={v._id} video={v} />
                        ))}
                    </div>
                    {total > 8 && (
                        <div className="flex items-center justify-center gap-2 pt-6">
                            <Button
                                id="prev-page"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const p = Math.max(1, page - 1);
                                    setPage(p);
                                }}
                                disabled={page === 1}
                                className="h-8 px-2.5 text-xs bg-white border-slate-200 text-slate-700"
                            >
                                <ChevronLeft className="size-3.5 mr-1" />
                                Prev
                            </Button>
                            <span className="text-xs text-slate-500 font-medium px-2">
                                Page {page} of {Math.ceil(total / 8)}
                            </span>
                            <Button
                                id="next-page"
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={videos.length < 8}
                                className="h-8 px-2.5 text-xs bg-white border-slate-200 text-slate-700"
                            >
                                Next
                                <ChevronRight className="size-3.5 ml-1" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
