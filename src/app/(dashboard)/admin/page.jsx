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
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertCircle,
    CheckCircle2,
    Database,
    PauseCircle,
    PlayCircle,
    Shield,
    UserCheck,
    Users,
    UserX,
    Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth.js";
import { api } from "../../../services/api.js";

function StatCard({ label, value, sub, icon: Icon, color = "purple" }) {
    const colorStyles = {
        purple: "bg-purple-50 text-purple-700 border-purple-100",
        green: "bg-emerald-50 text-emerald-700 border-emerald-100",
        blue: "bg-blue-50 text-blue-700 border-blue-100",
        yellow: "bg-amber-50 text-amber-700 border-amber-100",
    };

    return (
        <Card className="border-slate-200/90 bg-white shadow-2xs">
            <CardContent className="flex items-start justify-between">
                <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {label}
                    </span>
                    <div className="text-2xl font-bold text-slate-900">
                        {value ?? "—"}
                    </div>
                    {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
                </div>
                {Icon && (
                    <div
                        className={`p-2 rounded-lg border ${colorStyles[color] || colorStyles.purple}`}
                    >
                        <Icon className="size-4.5" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function AdminPage() {
    const { user } = useAuth();
    const [dashboard, setDashboard] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("overview");
    const [updatingUser, setUpdatingUser] = useState(null);
    const [msg, setMsg] = useState({ type: "", text: "" });

    useEffect(() => {
        if (user?.role !== "admin") return;
        Promise.all([api.admin.dashboard(), api.admin.users({ limit: 50 })])
            .then(([d, u]) => {
                if (d.success) setDashboard(d.dashboard);
                if (u.success) setUsers(u.users || []);
            })
            .finally(() => setLoading(false));
    }, [user]);

    const updateUser = async (id, updates) => {
        setUpdatingUser(id);
        const d = await api.admin.updateUser(id, updates);
        if (d.success) {
            setMsg({ type: "success", text: "User updated successfully." });
            const u = await api.admin.users({ limit: 50 });
            if (u.success) setUsers(u.users || []);
        } else {
            setMsg({ type: "error", text: d.error || "Update failed." });
        }
        setUpdatingUser(null);
        setTimeout(() => setMsg({ type: "", text: "" }), 4000);
    };

    if (!user || user.role !== "admin") {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm max-w-lg mx-auto mt-12">
                <AlertCircle className="size-5 shrink-0" />
                <span>
                    Admin access required. You do not have permissions to view
                    this panel.
                </span>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center py-32 gap-3">
                <Spinner className="size-8 text-primary" />
                <p className="text-sm text-slate-500">
                    Loading platform metrics...
                </p>
            </div>
        );
    }

    const d = dashboard;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Admin Console
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Real-time platform telemetry, generation queues, and user
                    privileges.
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

            <Tabs
                value={tab}
                onValueChange={setTab}
                className={"flex-col gap-4"}
            >
                <TabsList className="rounded-lg border border-slate-200/80 bg-slate-100 p-1">
                    <TabsTrigger id="tab-overview" value="overview">
                        Platform Telemetry
                    </TabsTrigger>
                    <TabsTrigger id="tab-users" value="users">
                        User Accounts ({users.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    {d && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <StatCard
                                    label="Total Videos"
                                    value={d.videos?.total || 0}
                                    icon={Video}
                                    color="purple"
                                />
                                <StatCard
                                    label="Total Users"
                                    value={d.users?.total || 0}
                                    sub={`${d.users?.admins || 0} admins`}
                                    icon={Users}
                                    color="blue"
                                />
                                <StatCard
                                    label="Active Jobs"
                                    value={d.jobs?.active || 0}
                                    icon={PlayCircle}
                                    color="green"
                                />
                                <StatCard
                                    label="Paused Jobs"
                                    value={d.jobs?.paused || 0}
                                    sub="Rate limited"
                                    icon={PauseCircle}
                                    color="yellow"
                                />
                                <StatCard
                                    label="Cached Assets"
                                    value={d.assetCache?.cachedAssets || 0}
                                    icon={Database}
                                    color="blue"
                                />
                            </div>

                            {d.videos?.recent?.length > 0 && (
                                <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
                                    <CardHeader>
                                        <CardTitle className="text-sm font-semibold text-slate-900">
                                            Recent Video Generations
                                        </CardTitle>
                                    </CardHeader>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                                <tr>
                                                    <th className="py-2.5 px-6">
                                                        Title
                                                    </th>
                                                    <th className="py-2.5 px-6">
                                                        Language
                                                    </th>
                                                    <th className="py-2.5 px-6">
                                                        Duration
                                                    </th>
                                                    <th className="py-2.5 px-6">
                                                        Created
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                                {d.videos.recent.map((v, i) => (
                                                    <tr
                                                        key={i}
                                                        className="hover:bg-slate-50/60"
                                                    >
                                                        <td className="py-3 px-6 font-medium text-slate-900 max-w-xs truncate">
                                                            {v.title ||
                                                                "Untitled"}
                                                        </td>
                                                        <td className="py-3 px-6">
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[10px] bg-slate-50"
                                                            >
                                                                {v.language ||
                                                                    "en"}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3 px-6 text-slate-500 font-mono">
                                                            {v.duration
                                                                ? `${v.duration?.toFixed(1)}s`
                                                                : "—"}
                                                        </td>
                                                        <td className="py-3 px-6 text-slate-400">
                                                            {new Date(
                                                                v.createdAt,
                                                            ).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="users">
                    <Card className="border-slate-200/90 bg-white shadow-2xs overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold text-slate-900">
                                User Directory ({users.length})
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500">
                                Configure user access, permissions, and monthly
                                quota allowances.
                            </CardDescription>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="py-2.5 px-6">User</th>
                                        <th className="py-2.5 px-6">Role</th>
                                        <th className="py-2.5 px-6">Status</th>
                                        <th className="py-2.5 px-6">Videos</th>
                                        <th className="py-2.5 px-6 text-right">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {users.map((u) => {
                                        const isSelf =
                                            String(u._id) === String(user._id);
                                        return (
                                            <tr
                                                key={String(u._id)}
                                                className="hover:bg-slate-50/60"
                                            >
                                                <td className="py-3 px-6">
                                                    <div className="font-semibold text-slate-900">
                                                        {u.name}
                                                    </div>
                                                    <div className="text-slate-400">
                                                        {u.email}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-6">
                                                    {u.role === "admin" ? (
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-purple-50 text-purple-700 border-purple-100 font-semibold"
                                                        >
                                                            Admin
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-slate-600 bg-slate-50"
                                                        >
                                                            User
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="py-3 px-6">
                                                    {u.status === "active" ? (
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        >
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-red-50 text-red-700 border-red-100"
                                                        >
                                                            Suspended
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="py-3 px-6 text-slate-600 font-mono">
                                                    {u.quota
                                                        ?.videosGeneratedThisMonth ||
                                                        0}
                                                    /
                                                    {u.quota
                                                        ?.maxVideosPerMonth ||
                                                        30}
                                                </td>
                                                <td className="py-3 px-6 text-right">
                                                    {!isSelf && (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                id={`toggle-status-${String(u._id)}`}
                                                                variant="outline"
                                                                size="xs"
                                                                onClick={() =>
                                                                    updateUser(
                                                                        String(
                                                                            u._id,
                                                                        ),
                                                                        {
                                                                            status:
                                                                                u.status ===
                                                                                "active"
                                                                                    ? "suspended"
                                                                                    : "active",
                                                                        },
                                                                    )
                                                                }
                                                                disabled={
                                                                    updatingUser ===
                                                                    String(
                                                                        u._id,
                                                                    )
                                                                }
                                                                className={
                                                                    u.status ===
                                                                    "active"
                                                                        ? "h-7 text-[11px] border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                        : "h-7 text-[11px] border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                                }
                                                            >
                                                                {u.status ===
                                                                "active" ? (
                                                                    <>
                                                                        <UserX className="size-3 mr-1" />
                                                                        Suspend
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserCheck className="size-3 mr-1" />
                                                                        Activate
                                                                    </>
                                                                )}
                                                            </Button>

                                                            {u.role !==
                                                                "admin" && (
                                                                <Button
                                                                    id={`make-admin-${String(u._id)}`}
                                                                    variant="outline"
                                                                    size="xs"
                                                                    onClick={() =>
                                                                        updateUser(
                                                                            String(
                                                                                u._id,
                                                                            ),
                                                                            {
                                                                                role: "admin",
                                                                            },
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        updatingUser ===
                                                                        String(
                                                                            u._id,
                                                                        )
                                                                    }
                                                                    className="h-7 text-[11px] border-purple-200 text-purple-700 hover:bg-purple-50"
                                                                >
                                                                    <Shield className="size-3 mr-1" />
                                                                    Make Admin
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
