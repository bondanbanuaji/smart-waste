"use client";

import { useEffect, useState } from "react";
import { useSSE } from "@/hooks/useSSE";
import { DashboardData, SSEDataUpdate, WasteEventItem } from "@/types";
import { CapacityCard } from "@/components/dashboard/CapacityCard";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { WasteBarChart } from "@/components/dashboard/WasteBarChart";
import { RecentEventTable } from "@/components/dashboard/RecentEventTable";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Scale, RefreshCw, BarChart4, TrendingUp } from "lucide-react";
import { useSession } from "next-auth/react";

interface AlertItem {
    id: string;
    deviceName: string;
    wadahType: string;
    capacityValue: number;
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const [data, setData] = useState<DashboardData | null>(null);
    const [recentEvents, setRecentEvents] = useState<WasteEventItem[]>([]);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);

    const firstName = session?.user?.name?.split(' ')[0] || "User";

    const fetchDashboard = async () => {
        try {
            const res = await fetch("/api/dashboard");
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchRecentEvents = async () => {
        try {
            const res = await fetch("/api/events?limit=5");
            const json = await res.json();
            setRecentEvents(json.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchAlerts = async () => {
        try {
            const res = await fetch("/api/notifications?isRead=false");
            const json = await res.json();
            setAlerts(json.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        Promise.all([fetchDashboard(), fetchRecentEvents(), fetchAlerts()]).then(() => {
            setLoading(false);
        });
    }, []);

    useSSE((update: SSEDataUpdate) => {
        // Optimistic UI updates based on SSE
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                stats: {
                    ...prev.stats,
                    totalEventToday: prev.stats.totalEventToday + 1,
                    totalOrganicToday: prev.stats.totalOrganicToday + (update.wasteType === "ORGANIC" ? 1 : 0),
                    totalInorganicToday: prev.stats.totalInorganicToday + (update.wasteType === "INORGANIC" ? 1 : 0),
                },
                devices: prev.devices.map(d => {
                    if (d.id === update.deviceId) {
                        return {
                            ...d,
                            lastPingAt: new Date().toISOString(),
                            latestCapacity: {
                                organicLevel: update.organicLevel,
                                inorganicLevel: update.inorganicLevel,
                                recordedAt: new Date().toISOString(),
                            }
                        };
                    }
                    return d;
                }),
            };
        });

        if (update.hasAlert) {
            fetchAlerts(); // Re-fetch to get actual Notification ID
        }

        fetchRecentEvents(); // Refresh event history table
    });

    const handleDismissAlert = async (id: string) => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: [id] }),
            });
            setAlerts(prev => prev.filter(a => a.id !== id));

            // Update global unread count optimistic 
            setData(prev => {
                if (!prev) return prev;
                return { ...prev, unreadNotificationCount: Math.max(0, prev.unreadNotificationCount - 1) };
            });
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) {
        return <LoadingSkeleton />;
    }

    const chartData = data?.stats.weeklyChartData || [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col gap-1 mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                    Halo, {firstName}!
                </h1>
                <p className="text-slate-500 dark:text-slate-400">Berikut adalah status pembuangan sampah hari ini.</p>
            </div>

            <AlertBanner
                alerts={alerts.map(a => ({
                    deviceName: a.deviceName,
                    wadahType: a.wadahType,
                    capacityValue: a.capacityValue,
                    notificationId: a.id,
                }))}
                onDismiss={handleDismissAlert}
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Event Hari Ini" value={data?.stats.totalEventToday || 0} icon={<RefreshCw className="h-5 w-5 text-blue-100" />} gradient="from-blue-500 to-indigo-600" />
                <StatCard title="Organik (Wet)" value={data?.stats.totalOrganicToday || 0} icon={<Scale className="h-5 w-5 text-green-100" />} gradient="from-emerald-500 to-green-600" />
                <StatCard title="Anorganik (Dry)" value={data?.stats.totalInorganicToday || 0} icon={<BarChart4 className="h-5 w-5 text-slate-100" />} gradient="from-slate-600 to-slate-800" />
                <StatCard title="Minggu Ini" value={data?.stats.totalEventThisWeek || 0} icon={<TrendingUp className="h-5 w-5 text-purple-100" />} gradient="from-violet-500 to-purple-600" />
            </div>

            {/* Capacity Cards (Living / Realtime) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
                {data?.devices.map(device => {
                    const cap = device.latestCapacity || { organicLevel: 0, inorganicLevel: 0, recordedAt: "" };
                    const isOnline = !!device.lastPingAt && (new Date().getTime() - new Date(device.lastPingAt).getTime() < 5 * 60000); // 5 mins

                    return (
                        <CapacityCard
                            key={device.id}
                            deviceName={device.name}
                            deviceCode={device.deviceCode}
                            location={device.location}
                            organicLevel={cap.organicLevel}
                            inorganicLevel={cap.inorganicLevel}
                            isOnline={isOnline}
                            lastUpdate={cap.recordedAt || device.lastPingAt}
                        />
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <WasteBarChart data={chartData} />
                </div>
                <div className="lg:col-span-1">
                    <RecentEventTable events={recentEvents} />
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, gradient }: { title: string, value: number, icon: React.ReactNode, gradient: string }) {
    return (
        <Card className={`border-none shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br ${gradient} text-white overflow-hidden relative group`}>
            {/* Glossy decorative bloobs */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-8 -mb-8" />

            <CardContent className="p-5 flex items-center justify-between relative z-10">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-white/80">{title}</p>
                    <p className="text-3xl font-bold tracking-tight">{value}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-inner">
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}
