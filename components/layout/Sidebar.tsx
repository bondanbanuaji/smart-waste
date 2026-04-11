"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, History, Smartphone, LogOut, Menu, X, Users, Settings } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";
import { useLayout } from "./LayoutContext";
import Image from "next/image";

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const role = (session?.user as { role?: string })?.role;
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { isMobileMenuOpen, setMobileMenuOpen } = useLayout();
    
    const userImage = session?.user?.image || null;

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname, setMobileMenuOpen]);

    const userName = session?.user?.name || "Pengguna";
    const userInitials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

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

    // Settings tersedia untuk semua role
    routes.push({
        label: "Pengaturan",
        icon: Settings,
        href: "/dashboard/settings",
        active: pathname === "/dashboard/settings",
    });

    return (
        <>
            {/* Mobile Drawer Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Content */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 flex h-full flex-col bg-white dark:bg-slate-950 border-r shadow-xl lg:shadow-sm border-slate-100 dark:border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
                isCollapsed ? "w-20" : "w-64"
            )}>
                <div className={cn("p-6 flex items-center justify-between", isCollapsed && "justify-center px-4")}>
                    <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            title={isCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
                            className="bg-green-100 dark:bg-green-900/40 p-2 rounded-xl shadow-inner border border-green-200 dark:border-green-800 shrink-0 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors focus:outline-none hidden lg:block"
                        >
                            <Menu className="h-6 w-6 text-green-600 dark:text-green-500" />
                        </button>
                        {!isCollapsed && (
                            <h1 className="text-xl font-bold bg-gradient-to-br from-green-700 to-green-500 bg-clip-text text-transparent">
                                Smart Waste
                            </h1>
                        )}
                    </div>
                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto overflow-x-hidden">
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
                            {(!isCollapsed || isMobileMenuOpen) && <span>{route.label}</span>}
                        </Link>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    {/* Avatar + User Info - Klik untuk ke Settings */}
                    {(!isCollapsed || isMobileMenuOpen) && (
                        <Link
                            href="/dashboard/settings"
                            className="group flex items-center gap-3 px-2 py-2.5 mb-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"
                        >
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden ring-2 ring-white dark:ring-slate-800 shadow-sm">
                                {userImage ? (
                                    <Image src={userImage} alt={userName} width={36} height={36} className="object-cover w-full h-full" unoptimized />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold select-none">
                                        {userInitials}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{userName}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{session?.user?.email}</p>
                            </div>
                        </Link>
                    )}

                    {/* Collapsed state: Just the avatar */}
                    {isCollapsed && !isMobileMenuOpen && (
                        <Link
                            href="/dashboard/settings"
                            className="flex justify-center mb-3"
                            title="Pengaturan Profil"
                        >
                            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white dark:ring-slate-800 shadow-sm hover:ring-green-500 transition-all">
                                {userImage ? (
                                    <Image src={userImage} alt={userName} width={40} height={40} className="object-cover w-full h-full" unoptimized />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold select-none">
                                        {userInitials}
                                    </div>
                                )}
                            </div>
                        </Link>
                    )}

                    <div className={cn("flex items-center gap-2", (isCollapsed && !isMobileMenuOpen) ? "flex-col justify-center" : "justify-between")}>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            title="Keluar"
                            className={cn(
                                "flex items-center px-3 py-2 text-sm font-medium text-red-600 dark:text-red-500 rounded-lg hover:bg-red-500/50 hover:text-red-100 dark:hover:text-red-400 transition-colors group overflow-hidden whitespace-nowrap",
                                (isCollapsed && !isMobileMenuOpen) ? "w-10 h-10 justify-center p-0" : "flex-1 gap-3"
                            )}
                        >
                            <LogOut className="h-5 w-5 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
                            {(!isCollapsed || isMobileMenuOpen) && <span>Keluar</span>}
                        </button>

                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </>
    );
}
