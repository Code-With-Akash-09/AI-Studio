"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuthRegister } from "../../../hooks/useAuth.js";
import { ROUTES } from "@/constants/routes.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Flame, ArrowRight, AlertCircle } from "lucide-react";

export default function RegisterPage() {
    const registerMutation = useAuthRegister();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [error, setError] = useState("");

    const destination =
        searchParams.get("redirect") ||
        searchParams.get("from") ||
        ROUTES.STUDIO;

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        if (form.password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        try {
            await registerMutation.mutateAsync({
                name: form.name,
                email: form.email,
                password: form.password,
            });
            router.push(destination);
        } catch (err) {
            setError(err?.message || "Registration failed. Please try again.");
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="w-full max-w-md relative z-10">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2.5 mb-3"
                    >
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/20">
                            <Flame className="size-5" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-slate-900">
                            AI Studio
                        </span>
                    </Link>
                    <p className="text-sm text-slate-600">
                        Create your account to start generating AI videos
                    </p>
                </div>

                <Card className="border-slate-200/80 bg-white shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-bold text-slate-900">
                            Create Account
                        </CardTitle>
                        <CardDescription className="text-sm text-slate-500">
                            Get started with free video generation credits
                            today.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                                    <AlertCircle className="size-4 shrink-0 text-red-600" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label
                                    htmlFor="name"
                                    className="text-xs font-semibold text-slate-700"
                                >
                                    Full Name
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Your Name"
                                    value={form.name}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            name: e.target.value,
                                        }))
                                    }
                                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-primary"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="email"
                                    className="text-xs font-semibold text-slate-700"
                                >
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            email: e.target.value,
                                        }))
                                    }
                                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-primary"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="password"
                                    className="text-xs font-semibold text-slate-700"
                                >
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="At least 8 characters"
                                    value={form.password}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            password: e.target.value,
                                        }))
                                    }
                                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-primary"
                                    required
                                />
                            </div>

                            <Button
                                id="register-btn"
                                type="submit"
                                size="lg"
                                className="w-full font-semibold shadow-xs"
                                disabled={registerMutation.isPending}
                            >
                                {registerMutation.isPending ? (
                                    <>
                                        <Spinner className="size-4 mr-2" />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        Create Account
                                        <ArrowRight className="size-4 ml-1.5" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="pt-0 justify-center">
                        <p className="text-sm text-slate-500 text-center">
                            Already have an account?{" "}
                            <Link
                                href={
                                    destination !== ROUTES.STUDIO
                                        ? `/login?redirect=${encodeURIComponent(destination)}`
                                        : "/login"
                                }
                                className="font-semibold text-primary hover:underline"
                            >
                                Sign in
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
