"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useLayout } from "@/components/layout/LayoutContext";
import { Menu } from "lucide-react";

export function Header() {
    const pathname = usePathname();
    const { setMobileMenuOpen } = useLayout();

    const getTitle = () => {
        if (pathname === "/dashboard") return "Dashboard";
        if (pathname === "/dashboard/history") return "Riwayat";
        if (pathname === "/dashboard/devices") return "Device";
        if (pathname === "/dashboard/accounts") return "Akun";
        if (pathname === "/dashboard/settings") return "Pengaturan";
        return "Dashboard";
    };

    return (
        <header className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-8 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
                    aria-label="Open Menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <h2 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100">{getTitle()}</h2>
            </div>
            <div className="flex items-center gap-4">
                <NotificationBell />
            </div>
        </header>
    );
}
