import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    ArrowRight,
    Mic,
    Video,
    FileText,
    Globe,
    Play,
    Flame,
} from "lucide-react";

export default function Home() {
    const features = [
        {
            icon: Mic,
            title: "Neural Voice Engine",
            desc: "Ultra-realistic AI voice synthesis with customizable pitch, speed, and emotional inflection.",
        },
        {
            icon: Video,
            title: "Dynamic AI Visuals",
            desc: "Automated scene generation matching your script's sentiment, rhythm, and pacing.",
        },
        {
            icon: FileText,
            title: "Animated Captions",
            desc: "Pixel-perfect word-by-word synced kinetic typography tailored for social engagement.",
        },
        {
            icon: Globe,
            title: "Multi-Language Dubbing",
            desc: "Generate and localize videos across 10+ languages with native accents in real-time.",
        },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col selection:bg-primary/15 selection:text-primary">
            {/* Navigation Header */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white shadow-xs">
                            <Flame className="size-4" />
                        </div>
                        <span className="text-base font-bold tracking-tight text-slate-900">
                            AI Studio
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                        <a
                            href="#features"
                            className="hover:text-slate-900 transition-colors"
                        >
                            Features
                        </a>
                        <a
                            href="#showcase"
                            className="hover:text-slate-900 transition-colors"
                        >
                            Showcase
                        </a>
                        <a
                            href="#pipeline"
                            className="hover:text-slate-900 transition-colors"
                        >
                            Pipeline
                        </a>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/login">Sign In</Link>
                        </Button>
                        <Button
                            size="sm"
                            asChild
                            className="font-semibold shadow-xs"
                        >
                            <Link href="/register">
                                Get Started
                                <ArrowRight className="size-3.5 ml-1.5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1">
                <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
                    {/* Pill Badge */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 mb-8 shadow-2xs">
                        <span className="flex size-2 rounded-full bg-primary animate-pulse" />
                        <span>Next-Gen Video Generation Platform</span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12] mb-6 max-w-4xl">
                        Turn any script into viral short-form videos with{" "}
                        <span className="text-primary">AI intelligence</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Create captivating videos with automated neural
                        narration, synchronized visuals, and dynamic captions in
                        seconds.
                    </p>

                    {/* CTA Button Group */}
                    <div className="flex flex-wrap items-center justify-center gap-3.5 mb-16">
                        <Button
                            size="lg"
                            asChild
                            className="h-11 px-6 font-semibold shadow-sm"
                        >
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                                <span>Start Generating Free</span>
                                <ArrowRight className="size-4 shrink-0" />
                            </Link>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            asChild
                            className="h-11 px-6 font-semibold text-slate-700 bg-white hover:bg-slate-50 border-slate-200"
                        >
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center whitespace-nowrap"
                            >
                                <span>Live Studio Demo</span>
                            </Link>
                        </Button>
                    </div>

                    {/* Showcase Card Preview */}
                    <div
                        id="showcase"
                        className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 sm:p-4 shadow-sm"
                    >
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                            <div className="h-10 bg-slate-50/90 border-b border-slate-100 px-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="size-2.5 rounded-full bg-slate-200" />
                                    <div className="size-2.5 rounded-full bg-slate-200" />
                                    <div className="size-2.5 rounded-full bg-slate-200" />
                                    <span className="text-xs font-medium text-slate-500 ml-2">
                                        studio.aistudio.com/generate
                                    </span>
                                </div>
                                <Badge
                                    variant="outline"
                                    className="text-[10px] bg-white border-slate-200 text-slate-600 font-semibold"
                                >
                                    Ready to Export
                                </Badge>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
                                {/* Script excerpt */}
                                <div className="md:col-span-7 space-y-4">
                                    <div className="space-y-1.5">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            Script Input
                                        </span>
                                        <p className="text-sm font-medium text-slate-800 leading-relaxed p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                                            "Did you know honey never spoils?
                                            Archaeologists have found pots of
                                            honey in ancient Egyptian tombs that
                                            are over 3,000 years old and
                                            perfectly edible."
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <Badge
                                            variant="secondary"
                                            className="bg-primary/10 text-primary"
                                        >
                                            🎙️ Male Neural
                                        </Badge>
                                        <Badge
                                            variant="secondary"
                                            className="bg-slate-100 text-slate-700"
                                        >
                                            📱 9:16 Vertical
                                        </Badge>
                                        <Badge
                                            variant="secondary"
                                            className="bg-slate-100 text-slate-700"
                                        >
                                            ⚡ 1080x1920 HD
                                        </Badge>
                                        <Badge
                                            variant="secondary"
                                            className="bg-emerald-50 text-emerald-700 border-emerald-100"
                                        >
                                            ✓ Captions Synced
                                        </Badge>
                                    </div>
                                </div>

                                {/* Preview Mock */}
                                <div className="md:col-span-5 bg-slate-900 rounded-xl flex items-center justify-center p-8 text-center text-white relative overflow-hidden min-h-[160px]">
                                    <div className="space-y-2 z-10 flex flex-col items-center">
                                        <div className="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                                            <Play className="size-5 ml-0.5" />
                                        </div>
                                        <span className="text-xs font-semibold tracking-wide text-slate-200">
                                            Preview Generation (18.4s)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Bento Grid */}
                <section
                    id="features"
                    className="py-20 border-t border-slate-100 bg-slate-50/50 px-6"
                >
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto mb-14">
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">
                                Everything you need to automate video production
                            </h2>
                            <p className="text-sm text-slate-600">
                                A complete generative toolchain engineered for
                                creators, marketers, and development teams.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {features.map(({ icon: Icon, title, desc }) => (
                                <Card
                                    key={title}
                                    className="border-slate-200/80 bg-white p-6 shadow-2xs hover:shadow-xs transition-shadow"
                                >
                                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                                        <Icon className="size-5" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 mb-1.5">
                                        {title}
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {desc}
                                    </p>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Bottom CTA Banner */}
                <section className="py-16 px-6 max-w-5xl mx-auto">
                    <div className="rounded-2xl bg-slate-900 text-white p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-lg">
                            <h3 className="text-2xl font-bold tracking-tight">
                                Ready to generate your first video?
                            </h3>
                            <p className="text-sm text-slate-400">
                                Start with free credits. No credit card
                                required.
                            </p>
                        </div>
                        <Button
                            asChild
                            size="lg"
                            className="bg-primary text-white hover:bg-primary/90 shrink-0 font-semibold shadow-sm"
                        >
                            <Link href="/register">
                                Get Started Free
                                <ArrowRight className="size-4 ml-1.5" />
                            </Link>
                        </Button>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-100 py-8 px-6 bg-white text-xs text-slate-500">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Flame className="size-4 text-primary" />
                        <span className="font-semibold text-slate-700">
                            AI Video Studio
                        </span>
                        <span>
                            © {new Date().getFullYear()} All rights reserved.
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link
                            href="/login"
                            className="hover:text-slate-900 transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/register"
                            className="hover:text-slate-900 transition-colors"
                        >
                            Register
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
