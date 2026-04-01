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

interface AlertItem {
    id: string;
    deviceName: string;
    wadahType: string;
    capacityValue: number;
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [recentEvents, setRecentEvents] = useState<WasteEventItem[]>([]);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);

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

    const chartData = [
        { label: "Hari Ini", organic: data?.stats.totalOrganicToday || 0, inorganic: data?.stats.totalInorganicToday || 0 },
        // Mocking yesterday's data for comparison visually
        { label: "Kemarin", organic: Math.floor((data?.stats.totalOrganicToday || 0) * 0.8), inorganic: Math.floor((data?.stats.totalInorganicToday || 0) * 1.2) },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Event Hari Ini" value={data?.stats.totalEventToday || 0} icon={<RefreshCw className="h-5 w-5 text-blue-500" />} />
                <StatCard title="Sampah Organik" value={data?.stats.totalOrganicToday || 0} icon={<Scale className="h-5 w-5 text-green-500" />} />
                <StatCard title="Sampah Anorganik" value={data?.stats.totalInorganicToday || 0} icon={<BarChart4 className="h-5 w-5 text-slate-500 dark:text-slate-400" />} />
                <StatCard title="Minggu Ini" value={data?.stats.totalEventThisWeek || 0} icon={<TrendingUp className="h-5 w-5 text-indigo-500" />} />
            </div>

            {/* Capacity Cards (Living / Realtime) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
    return (
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-card text-card-foreground">
            <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{value}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-inner">
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}
