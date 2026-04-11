"use client";

import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/types";
import { formatRelativeTime } from "@/lib/utils";


export function NotificationBell() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications?isRead=false");
            const data = await res.json();
            if (data.data) {
                setNotifications(data.data);
                setUnreadCount(data.data.length);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // In a real app we'd also listen to SSE events here to increment the badge
        const eventSource = new EventSource("/api/sse");
        eventSource.onmessage = () => {
            // The custom route sends 'event: data-update' which is handled via addEventListener
        };
        eventSource.addEventListener("data-update", (e: MessageEvent) => {
            const payload = JSON.parse(e.data);
            if (payload.hasAlert) {
                // Realtime Sync: Buat item notifikasi baru dari payload
                const newNotification: NotificationItem = {
                    id: payload.notificationId || Math.random().toString(),
                    deviceName: payload.deviceName || "Device",
                    wadahType: payload.alertWadah || "ORGANIC",
                    capacityValue: payload.capacityValue || 90,
                    isRead: false,
                    createdAt: payload.notificationCreatedAt || new Date().toISOString(),
                };

                // Prepend ke list dan update count secara instan
                setNotifications(prev => {
                    // Cek apakah ID sudah ada untuk menghindari duplikasi
                    if (prev.some(n => n.id === newNotification.id)) return prev;
                    return [newNotification, ...prev];
                });
                setUnreadCount(prev => prev + 1);
            }
        });

        return () => eventSource.close();
    }, []);

    const markAllAsRead = async () => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAll: true }),
            });
            setNotifications([]);
            setUnreadCount(0);
        } catch (e) {
            console.error(e);
        }
    };

    const markAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: [id] }),
            });
            setNotifications(prev => prev.filter(n => n.id !== id));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full h-10 w-10">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow ring-2 ring-white dark:ring-slate-900">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl shadow-xl overflow-hidden border-slate-100 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-100 dark:border-slate-700">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">Notifikasi</p>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-auto p-0 text-xs text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-transparent">
                            <CheckCheck className="w-3.5 h-3.5 mr-1" />
                            Tandai semua dibaca
                        </Button>
                    )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
                            <Bell className="w-8 h-8 opacity-20" />
                            <p className="text-sm">Tidak ada notifikasi baru</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {notifications.map((n) => (
                                <div key={n.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3 group">
                                    <div className="mt-0.5 bg-red-100 dark:bg-red-900/40 p-1.5 rounded-full shrink-0">
                                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight">
                                            Wadah {n.wadahType} Penuh!
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                            {n.deviceName} mencapai batas kapasitas ({n.capacityValue}%).
                                        </p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                                            {formatRelativeTime(n.createdAt)}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 h-8 w-8 text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all rounded-full"
                                        onClick={(e) => markAsRead(n.id, e)}
                                        title="Tandai sudah dibaca"
                                    >
                                        <Check className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
