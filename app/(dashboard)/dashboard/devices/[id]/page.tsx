"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, Droplet, Sun, Trash2, ShieldAlert, Cpu, Activity, RefreshCw } from "lucide-react";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useSSE } from "@/hooks/useSSE";
import { SSEDataUpdate } from "@/types";

interface Device {
    id: string;
    deviceCode: string;
    name: string;
    location: string;
    isActive: boolean;
    lastPingAt: string | null;
    capacity?: {
        organic: number;
        inorganic: number;
    }
}

export default function DeviceManagePage() {
    const params = useParams();
    const router = useRouter();
    const [device, setDevice] = useState<Device | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDevice = async () => {
            try {
                // To keep it simple, we can fetch all devices and find the one.
                // Ideally we'd have a GET /api/devices/[id] but this works.
                const res = await fetch("/api/devices");
                const json = await res.json();
                if (json.data) {
                    const found = json.data.find((d: Device) => d.id === params.id);
                    if (found) {
                        setDevice(found);
                    } else {
                        setError("Device tidak ditemukan.");
                    }
                }
            } catch (err) {
                setError("Gagal memuat data device.");
            } finally {
                setLoading(false);
            }
        };

        fetchDevice();
    }, [params.id]);

    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 5000);
        return () => clearInterval(timer);
    }, []);

    // Listen for real-time ping/events from the bridge
    useSSE((update: SSEDataUpdate) => {
        setDevice(prev => {
            if (!prev) return prev;
            if (prev.id === update.deviceId || prev.deviceCode === update.deviceCode) {
                return {
                    ...prev,
                    name: update.deviceName || prev.name,
                    lastPingAt: update.lastPingAt || new Date().toISOString(),
                    capacity: update.organicLevel !== undefined ? {
                        organic: update.organicLevel,
                        inorganic: update.inorganicLevel || 0
                    } : prev.capacity
                };
            }
            return prev;
        });
    });

    const sendCommand = async (command: string) => {
        setIsSending(true);
        setError(null);
        try {
            const res = await fetch(`/api/devices/${params.id}/command`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Gagal mengirim perintah.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
        } finally {
            setIsSending(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kembali
                </Button>
                <LoadingSkeleton />
            </div>
        );
    }

    if (!device) {
        return (
            <div className="max-w-4xl mx-auto text-center py-20">
                <ShieldAlert className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Device Tidak Ditemukan</h2>
                <Button onClick={() => router.push("/dashboard/devices")} className="mt-4">Kembali ke Daftar Device</Button>
            </div>
        );
    }

    const parsedPing = device.lastPingAt ? new Date(device.lastPingAt).getTime() : 0;
    const isOnline = parsedPing > 0 && (currentTime - parsedPing < 60000);

    const lastPingFormatted = parsedPing > 0 
        ? new Date(device.lastPingAt!).toLocaleString('id-ID') 
        : "Belum pernah aktif atau sedang dalam kondisi offline (Dimatikan)";

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col gap-4">
                <Button 
                    variant="ghost" 
                    onClick={() => router.push("/dashboard/devices")} 
                    className="w-fit -ml-3 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kembali
                </Button>
                
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <Cpu className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                            {device.name}
                        </h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pl-[3.25rem]">
                        <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono shadow-sm">
                            {device.deviceCode}
                        </span>
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm border ${isOnline ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'}`}>
                            {isOnline ? "Terhubung (Online)" : "Terputus (Offline)"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Informasi Unit Card */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-slate-500" />
                            Detail Perangkat
                        </h3>
                    </div>
                    <div className="p-6">
                        <dl className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                            <div>
                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Lokasi Penempatan</dt>
                                <dd className="text-base text-slate-900 dark:text-slate-100 font-medium">
                                    {device.location || "Lokasi belum ditentukan"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Aktivitas Terakhir</dt>
                                <dd className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                                    {lastPingFormatted}
                                </dd>
                            </div>
                        </dl>
                        
                        {/* Live Capacity Indicators */}
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-5">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Live Capacity Monitor</h4>
                            
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        Organik (Wet)
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{device.capacity?.organic || 0}%</span>
                                </div>
                                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                                        style={{ width: `${device.capacity?.organic || 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                        Anorganik (Dry)
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{device.capacity?.inorganic || 0}%</span>
                                </div>
                                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-amber-500 transition-all duration-1000 ease-out" 
                                        style={{ width: `${device.capacity?.inorganic || 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Backdoor Control Card */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            Manual Override
                        </h3>
                    </div>
                    
                    <div className="p-6 flex flex-col">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                            Ambil alih kendali motor servo pembuka pintu. Mengaktifkan fitur ini akan membypass sensor pintar. Klik tombol "Kembalikan ke Otomatis" setelah selesai agar alat berfungsi normal.
                        </p>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-4 rounded-xl border border-red-200 dark:border-red-900/50 mb-6 flex items-start gap-3">
                                <ShieldAlert className="w-5 h-5 shrink-0" />
                                <p className="leading-relaxed">{error}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <Button 
                                variant="outline" 
                                className="h-16 flex flex-col gap-1.5 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-500/10 dark:hover:border-blue-500/30 transition-all text-slate-700 dark:text-slate-300 group"
                                onClick={() => sendCommand("OPEN_ORGANIC")}
                                disabled={isSending}
                            >
                                <Droplet className="w-[18px] h-[18px] text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="font-medium">Pintu Basah</span>
                            </Button>
                            <Button 
                                variant="outline" 
                                className="h-16 flex flex-col gap-1.5 border border-slate-200 dark:border-slate-700 hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-500/10 dark:hover:border-orange-500/30 transition-all text-slate-700 dark:text-slate-300 group"
                                onClick={() => sendCommand("OPEN_INORGANIC")}
                                disabled={isSending}
                            >
                                <Sun className="w-[18px] h-[18px] text-orange-500 group-hover:scale-110 transition-transform" />
                                <span className="font-medium">Pintu Kering</span>
                            </Button>
                        </div>

                        <Button 
                            className="w-full font-semibold h-12 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 transition-colors rounded-xl shadow-none"
                            onClick={() => sendCommand("CLOSE")}
                            disabled={isSending}
                        >
                            {isSending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2 opacity-70" />}
                            Kembalikan ke Mode Otomatis
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
