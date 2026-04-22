"use client";

import { useEffect, useState } from "react";
import { useSSE } from "@/hooks/useSSE";
import { useTTS } from "@/hooks/useTTS";
import { DashboardData, SSEDataUpdate, WasteEventItem } from "@/types";
import { CapacityCard } from "@/components/dashboard/CapacityCard";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { WasteBarChart } from "@/components/dashboard/WasteBarChart";
import { RecentEventTable } from "@/components/dashboard/RecentEventTable";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Trash2, AlertCircle, Activity, Leaf, Recycle, CalendarDays } from "lucide-react";

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
    const [audioEnabled, setAudioEnabled] = useState(false);

    const firstName = session?.user?.name?.split(' ')[0] || "User";
    const { speak } = useTTS();

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
        const isPing = update.type === "ping";

        // 🔊 Text-to-Speech: Umumkan jenis sampah yang terdeteksi
        if (!isPing && update.wasteType) {
            const label = update.wasteType === "ORGANIC" ? "Organik" : "Anorganik";
            const speechType = update.wasteType === "ORGANIC" ? "organik" : "anorganik";
            
            // 🍞 Toast Notification
            toast.success(`Sampah ${label} Terdeteksi!`, {
                description: `${update.deviceName || "Device"} baru saja menerima sampah.`,
                icon: <Trash2 className="w-4 h-4 text-green-500" />,
            });

            if (audioEnabled) {
                const rawName = update.deviceName || update.deviceCode;
                let spokenName = rawName.toLowerCase().replace(/[-_]/g, " ");
                if (spokenName.includes("arduino")) {
                    spokenName = spokenName.replace(/arduino/g, "ardu ino");
                }
                speak(`Sampah ${speechType} terdeteksi pada ${spokenName}`);
            }
        }

        // Optimistic UI updates based on SSE
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                stats: {
                    ...prev.stats,
                    // Hanya tambah statistik jika ini adalah event sampah (bukan ping)
                    totalEventToday: isPing ? prev.stats.totalEventToday : prev.stats.totalEventToday + 1,
                    totalOrganicToday: prev.stats.totalOrganicToday + (update.wasteType === "ORGANIC" ? 1 : 0),
                    totalInorganicToday: prev.stats.totalInorganicToday + (update.wasteType === "INORGANIC" ? 1 : 0),
                    totalEventThisWeek: isPing ? prev.stats.totalEventThisWeek : prev.stats.totalEventThisWeek + 1,
                },
                devices: prev.devices.map(d => {
                    if (d.id === update.deviceId || d.deviceCode === update.deviceCode) {
                        return {
                            ...d,
                            name: update.deviceName || d.name, // Update nama secara realtime
                            lastPingAt: update.lastPingAt || new Date().toISOString(),
                            latestCapacity: isPing ? d.latestCapacity : {
                                organicLevel: update.organicLevel ?? d.latestCapacity?.organicLevel ?? 0,
                                inorganicLevel: update.inorganicLevel ?? d.latestCapacity?.inorganicLevel ?? 0,
                                recordedAt: new Date().toISOString(),
                            }
                        };
                    }
                    return d;
                }),
            };
        });

        // Jika ada event sampah baru, tambahkan ke tabel Recent Events secara realtime
        if (!isPing && update.wasteType) {
            const newEvent: WasteEventItem = {
                id: Math.random().toString(36).substring(7), // Temporary ID for UI
                deviceCode: update.deviceCode,
                deviceName: update.deviceName || "Device",
                wasteType: update.wasteType,
                moistureValue: update.moistureValue || 0,
                detectedAt: new Date().toISOString(),
            };
            setRecentEvents(prev => [newEvent, ...prev].slice(0, 5));

            // SINKRONISASI GRAFIK MINGGUAN (Realtime Bar Chart)
            setData(prev => {
                if (!prev) return prev;
                const todayLabel = new Date().toLocaleDateString('id-ID', { weekday: 'short' });
                const updatedChart = prev.stats.weeklyChartData.map(day => {
                    if (day.label === todayLabel) {
                        return {
                            ...day,
                            organic: day.organic + (update.wasteType === "ORGANIC" ? 1 : 0),
                            inorganic: day.inorganic + (update.wasteType === "INORGANIC" ? 1 : 0)
                        };
                    }
                    return day;
                });
                return {
                    ...prev,
                    stats: { ...prev.stats, weeklyChartData: updatedChart }
                };
            });
        }

        if (update.hasAlert) {
            fetchAlerts(); // Re-fetch untuk sinkronisasi notifikasi
            
            // 🍞 Toast Alert
            toast.error(`Kapasitas Penuh!`, {
                description: `${update.deviceName || "Device"} (${update.alertWadah}) sudah mencapai batas.`,
                icon: <AlertCircle className="w-4 h-4" />,
                duration: 5000,
            });

            // Increment unread notification count
            setData(prev => prev ? { ...prev, unreadNotificationCount: prev.unreadNotificationCount + 1 } : prev);
        }
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
        <div 
            className="space-y-6 animate-in fade-in duration-500 pb-12"
            onClick={() => {
                if (!audioEnabled) {
                    setAudioEnabled(true);
                    // Test sound on first click to acknowledge user interaction
                    speak("Sistem suara diaktifkan");
                }
            }}
        >
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
                <StatCard title="Total Event Hari Ini" value={data?.stats.totalEventToday || 0} icon={<Activity className="h-5 w-5 text-sky-600 dark:text-sky-300" />} gradient="from-sky-100 to-blue-200 dark:from-sky-900/40 dark:to-blue-900/40" textClass="text-sky-900 dark:text-sky-50" />
                <StatCard title="Organik (Wet)" value={data?.stats.totalOrganicToday || 0} icon={<Leaf className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />} gradient="from-emerald-100 to-teal-200 dark:from-emerald-900/40 dark:to-teal-900/40" textClass="text-emerald-900 dark:text-emerald-50" />
                <StatCard title="Anorganik (Dry)" value={data?.stats.totalInorganicToday || 0} icon={<Recycle className="h-5 w-5 text-amber-600 dark:text-amber-300" />} gradient="from-orange-100 to-amber-200 dark:from-orange-900/40 dark:to-amber-900/40" textClass="text-amber-900 dark:text-amber-50" />
                <StatCard title="Minggu Ini" value={data?.stats.totalEventThisWeek || 0} icon={<CalendarDays className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-300" />} gradient="from-fuchsia-100 to-pink-200 dark:from-fuchsia-900/40 dark:to-pink-900/40" textClass="text-fuchsia-900 dark:text-fuchsia-50" />
            </div>

            {/* Capacity Cards (Living / Realtime) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
                {data?.devices.map(device => {
                    const cap = device.latestCapacity || { organicLevel: 0, inorganicLevel: 0, recordedAt: "" };
                    const isOnline = !!device.lastPingAt && (new Date().getTime() - new Date(device.lastPingAt).getTime() < 60000); // 1 min (lebih responsif)

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

function StatCard({ title, value, icon, gradient, textClass = "text-slate-800 dark:text-slate-100" }: { title: string, value: number, icon: React.ReactNode, gradient: string, textClass?: string }) {
    return (
        <Card className={`border border-white/40 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br ${gradient} overflow-hidden relative group`}>
            {/* Glossy decorative bloobs */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 dark:bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 dark:bg-black/20 rounded-full blur-xl -ml-8 -mb-8" />

            <CardContent className="p-5 flex items-center justify-between relative z-10">
                <div className={`space-y-1 ${textClass}`}>
                    <p className="text-sm font-semibold opacity-80">{title}</p>
                    <p className="text-3xl font-extrabold tracking-tight drop-shadow-sm">{value}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-white/40 dark:border-white/10 flex items-center justify-center shadow-sm">
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}
