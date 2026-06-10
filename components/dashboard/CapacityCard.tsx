"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCapacityColor, getCapacityBgColor, formatRelativeTime } from "@/lib/utils";
import { MapPin, Wifi, WifiOff, Trash2, Recycle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CapacityCardProps {
    deviceId: string;
    deviceName: string;
    deviceCode: string;
    location: string;
    organicLevel: number;
    inorganicLevel: number;
    isOnline: boolean;
    lastUpdate: string | null;
}

export function CapacityCard({
    deviceId,
    deviceName,
    deviceCode,
    location,
    organicLevel,
    inorganicLevel,
    isOnline,
    lastUpdate,
}: CapacityCardProps) {
    const [isCleaning, setIsCleaning] = useState(false);
    
    // DEBUG LOG
    console.log(`[CapacityCard:${deviceCode}] Rendering with deviceId:`, deviceId);

    const isDangerSession = organicLevel >= 90 || inorganicLevel >= 90;

    const handleCleanup = async () => {
        console.log(`[CapacityCard:${deviceCode}] handleCleanup clicked. Current deviceId:`, deviceId);
        
        if (!deviceId || deviceId === "undefined" || deviceId === "[object Object]") {
            console.error(`❌ [Cleanup:${deviceCode}] Invalid Device ID:`, deviceId);
            toast.error("ID Perangkat tidak valid.");
            return;
        }

        setIsCleaning(true);
        try {
            const cleanupUrl = `/api/devices/${deviceId}/cleanup`;
            console.log(`🚀 [Cleanup:${deviceCode}] Fetching: ${cleanupUrl}`);
            
            const res = await fetch(cleanupUrl, {
                method: "POST",
            });
            if (!res.ok) throw new Error("Gagal membersihkan");
            toast.success("Berhasil!", { description: `Wadah ${deviceName} telah dikosongkan.` });
            console.log("✅ [Cleanup] Success from Dashboard");
        } catch (error) {
            console.error("❌ [Cleanup] Error from Dashboard:", error);
            toast.error("Gagal melakukan pembersihan");
        } finally {
            setIsCleaning(false);
        }
    };

    return (
        <Card className={`group relative overflow-hidden transition-all duration-500 border-none shadow-sm ${isDangerSession ? 'ring-2 ring-red-500 shadow-red-100' : 'hover:shadow-md'}`}>

            {/* Background Warning Glow if Full */}
            {isDangerSession && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/10 dark:bg-red-900/20 rounded-full blur-3xl -z-10 animate-pulse" />
            )}

            <CardHeader className="pb-3 border-b border-slate-50">
                <div className="flex justify-between items-start">
                    <div className="space-y-1 relative z-10">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">{deviceName}</CardTitle>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOnline ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                {deviceCode}
                            </span>
                        </div>
                        <CardDescription className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <MapPin className="h-3.5 w-3.5" />
                            {location}
                        </CardDescription>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        <div className={`p-1.5 rounded-full ${isOnline ? 'bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                        </div>
                        {lastUpdate && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                {formatRelativeTime(lastUpdate)}
                            </span>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-5 pb-5 space-y-5 relative">
                {/* Cleanup Button (Visible on Hover or if Danger) */}
                <div className={`absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-[2px] transition-all duration-300 ${isCleaning ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'}`}>
                    <button
                        onClick={handleCleanup}
                        disabled={isCleaning}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 transition-all active:scale-95 disabled:opacity-70"
                    >
                        {isCleaning ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Recycle className="w-4 h-4" />
                        )}
                        {isCleaning ? "Membersihkan..." : "Kosongkan Wadah"}
                    </button>
                </div>

                {/* Organic Container */}
                <div className="space-y-2 relative">
                    <div className="flex justify-between items-end mb-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-green-50/80 dark:bg-green-950/50 shadow-sm border border-green-100 dark:border-green-900 border-b-2">
                                <LeafIcon className="w-4 h-4 text-green-600 dark:text-green-500" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sampah Basah</span>
                        </div>
                        <span className={`text-base font-bold ${getCapacityColor(organicLevel)}`}>
                            {organicLevel}%
                        </span>
                    </div>
                    <div className="relative h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <div
                            className={`h-full transition-all duration-1000 ease-in-out ${organicLevel > 80 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-400 to-green-500'}`}
                            style={{ width: `${organicLevel}%` }}
                        />
                    </div>
                </div>

                {/* Inorganic Container */}
                <div className="space-y-2 relative">
                    <div className="flex justify-between items-end mb-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 border-b-2">
                                <Trash2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sampah Kering</span>
                        </div>
                        <span className={`text-base font-bold ${getCapacityColor(inorganicLevel)}`}>
                            {inorganicLevel}%
                        </span>
                    </div>
                    <div className="relative h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <div
                            className={`h-full transition-all duration-1000 ease-in-out ${inorganicLevel > 80 ? 'bg-red-500' : 'bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-500 dark:to-slate-400'}`}
                            style={{ width: `${inorganicLevel}%` }}
                        />
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}

// Simple Leaf Icon SVG
function LeafIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M11 20A7 7 0 0 1 14 6h7v7a7 7 0 0 1-7 7H4a7 7 0 0 1 7-7Z" />
            <path d="M11 20v-7" />
        </svg>
    );
}
