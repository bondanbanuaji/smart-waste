"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, History, Smartphone, LogOut, Menu, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const role = (session?.user as { role?: string })?.role;
    const [isCollapsed, setIsCollapsed] = useState(false);

    const routes = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/dashboard",
            active: pathname === "/dashboard",
        },
        {
            label: "Riwayat",
            icon: History,
            href: "/dashboard/history",
            active: pathname === "/dashboard/history",
        },
    ];

    if (role === "ADMIN") {
        routes.push({
            label: "Devices",
            icon: Smartphone,
            href: "/dashboard/devices",
            active: pathname === "/dashboard/devices",
        });
        routes.push({
            label: "Kelola Akun",
            icon: Users,
            href: "/dashboard/accounts",
            active: pathname === "/dashboard/accounts",
        });
    }

    return (
        <div className={cn(
            "flex h-full flex-col bg-background border-r shadow-sm border-border relative z-20 transition-all duration-300",
            isCollapsed ? "w-20" : "w-64"
        )}>
            <div className={cn("p-6", isCollapsed && "px-4")}>
                <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
                        className="bg-green-100 dark:bg-green-900/40 p-2 rounded-xl shadow-inner border border-green-200 dark:border-green-800 shrink-0 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors focus:outline-none"
                    >
                        <Menu className="h-6 w-6 text-green-600 dark:text-green-500" />
                    </button>
                    {!isCollapsed && (
                        <h1 className="text-xl font-bold bg-gradient-to-br from-green-700 to-green-500 bg-clip-text text-transparent">
                            Smart Waste
                        </h1>
                    )}
                </div>
            </div>

            <div className="flex-1 px-4 py-2 space-y-1 overflow-hidden">
                {routes.map((route) => (
                    <Link
                        key={route.href}
                        href={route.href}
                        title={route.label}
                        className={cn(
                            "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all group overflow-hidden whitespace-nowrap",
                            isCollapsed ? "justify-center gap-0" : "gap-3",
                            route.active
                                ? "bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-500 shadow-sm ring-1 ring-green-500/10 dark:ring-green-500/20"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                        )}
                    >
                        <route.icon
                            className={cn(
                                "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                                route.active ? "text-green-600 dark:text-green-500" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                            )}
                        />
                        {!isCollapsed && <span>{route.label}</span>}
                    </Link>
                ))}
            </div>

            <div className="p-4 border-t border-border bg-muted/30">
                {!isCollapsed && (
                    <div className="mb-4 px-2">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{session?.user?.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{session?.user?.email}</p>
                    </div>
                )}
                <div className={cn("flex items-center gap-2", isCollapsed ? "flex-col justify-center" : "justify-between")}>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        title="Keluar"
                        className={cn(
                            "flex items-center px-3 py-2 text-sm font-medium text-red-600 dark:text-red-500 rounded-lg hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400 transition-colors group overflow-hidden whitespace-nowrap",
                            isCollapsed ? "w-10 h-10 justify-center p-0" : "flex-1 gap-3"
                        )}
                    >
                        <LogOut className="h-5 w-5 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
                        {!isCollapsed && <span>Keluar</span>}
                    </button>

                    <ThemeToggle />
                </div>
            </div>
        </div>
    );
}
