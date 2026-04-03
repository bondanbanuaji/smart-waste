"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCapacityColor, getCapacityBgColor, formatRelativeTime } from "@/lib/utils";
import { MapPin, Wifi, WifiOff, Trash2 } from "lucide-react";

interface CapacityCardProps {
    deviceName: string;
    deviceCode: string;
    location: string;
    organicLevel: number;
    inorganicLevel: number;
    isOnline: boolean;
    lastUpdate: string | null;
}

export function CapacityCard({
    deviceName,
    deviceCode,
    location,
    organicLevel,
    inorganicLevel,
    isOnline,
    lastUpdate,
}: CapacityCardProps) {
    const isDangerSession = organicLevel >= 90 || inorganicLevel >= 90;

    return (
        <Card className={`relative overflow-hidden transition-all duration-500 border-none shadow-sm ${isDangerSession ? 'ring-2 ring-red-500 shadow-red-100' : 'hover:shadow-md'}`}>

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

            <CardContent className="pt-5 pb-5 space-y-5">

                {/* Organic Container */}
                <div className="space-y-2 relative">
                    <div className="flex justify-between items-end mb-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-green-50/80 dark:bg-green-950/50 shadow-sm border border-green-100 dark:border-green-900 border-b-2">
                                <LeafIcon className="w-4 h-4 text-green-600 dark:text-green-500" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Organik (Wet)</span>
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
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Anorganik (Dry)</span>
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
