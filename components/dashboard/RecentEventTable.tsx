import { formatRelativeTime } from "@/lib/utils";
import { WasteEventItem } from "@/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoveRight } from "lucide-react";
import Link from "next/link";

export function RecentEventTable({ events }: { events: WasteEventItem[] }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Event Pembuangan Terbaru</h3>
                <Link href="/dashboard/history" className="text-sm font-medium text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 flex items-center gap-1 group">
                    Lihat Semua
                    <MoveRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            {events.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500">Belum ada riwayat pembuangan.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-4 font-medium">Waktu</th>
                                <th className="px-6 py-4 font-medium">Device</th>
                                <th className="px-6 py-4 font-medium">Jenis Sampah</th>
                                <th className="px-6 py-4 font-medium text-right">Moisture</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {events.map((event) => (
                                <tr key={event.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                        {formatRelativeTime(event.detectedAt)}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                                        {event.deviceName} <span className="text-slate-400 dark:text-slate-500 text-xs ml-1">({event.deviceCode})</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge type={event.wasteType} />
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                                        {event.moistureValue.toFixed(1)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
