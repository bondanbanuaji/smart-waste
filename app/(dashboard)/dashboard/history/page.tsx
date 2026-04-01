"use client";

import { useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { WasteEventItem } from "@/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

export default function HistoryPage() {
    const [events, setEvents] = useState<WasteEventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterType, setFilterType] = useState<string>("");

    const fetchHistory = async (p: number, type: string) => {
        setLoading(true);
        try {
            let url = `/api/events?page=${p}&limit=20`;
            if (type) url += `&type=${type}`;

            const res = await fetch(url);
            const json = await res.json();
            if (json.data) {
                setEvents(json.data);
                setTotalPages(json.pagination.totalPages);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory(page, filterType);
    }, [page, filterType]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Riwayat Pembuangan</h1>
                    <p className="text-slate-500 dark:text-slate-400">Mencatat setiap event sampah yang dibuang ke wadah.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-white dark:bg-slate-900/50 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-1">
                        <button
                            onClick={() => { setFilterType(""); setPage(1); }}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filterType === "" ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                        >
                            Semua
                        </button>
                        <button
                            onClick={() => { setFilterType("ORGANIC"); setPage(1); }}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filterType === "ORGANIC" ? "bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-500" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                        >
                            Organik (Wet)
                        </button>
                        <button
                            onClick={() => { setFilterType("INORGANIC"); setPage(1); }}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filterType === "INORGANIC" ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                        >
                            Anorganik (Dry)
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">No</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Waktu</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Device</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Jenis Sampah</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-right">Moisture</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center"><LoadingSkeleton /></td>
                                </tr>
                            ) : events.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Filter className="w-10 h-10 text-slate-200" />
                                            <p>Tidak ada data ditemukan untuk filter tersebut.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                events.map((event, index) => (
                                    <tr key={event.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                            {(page - 1) * 20 + index + 1}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                            {formatRelativeTime(event.detectedAt)}
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                                                {new Date(event.detectedAt).toLocaleString('id-ID')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-slate-700 dark:text-slate-200">{event.deviceName}</span>
                                            <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                                                {event.deviceCode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge type={event.wasteType} />
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300 font-mono">
                                            {event.moistureValue.toFixed(1)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Halaman <span className="text-slate-800 dark:text-slate-100">{page}</span> dari <span className="text-slate-800 dark:text-slate-100">{totalPages}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="hover:bg-slate-100"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Sebelumnya
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="hover:bg-slate-100"
                            >
                                Selanjutnya
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
