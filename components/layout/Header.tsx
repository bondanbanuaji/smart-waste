"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/layout/NotificationBell";

export function Header() {
    const pathname = usePathname();

    const getTitle = () => {
        if (pathname === "/dashboard") return "Dashboard Overview";
        if (pathname === "/dashboard/history") return "Riwayat Pembuangan";
        if (pathname === "/dashboard/devices") return "Manajemen Device";
        return "Dashboard";
    };

    return (
        <header className="h-16 flex items-center justify-between px-8 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <img src="/logo.png" className="w-8 h-8 rounded-lg shadow-sm" alt="Logo" />
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{getTitle()}</h2>
            </div>
            <div className="flex items-center gap-4">
                <NotificationBell />
            </div>
        </header>
    );
}
