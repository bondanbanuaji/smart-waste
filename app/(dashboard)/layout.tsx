import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LayoutProvider } from "@/components/layout/LayoutContext";

export const metadata: Metadata = {
    title: {
        default: "Dashboard",
        template: "%s | Smart Waste",
    },
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <LayoutProvider>
            <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-foreground overflow-hidden font-sans selection:bg-green-200">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden relative w-full transition-all">
                    <Header />
                    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
                        {children}
                    </main>
                </div>
            </div>
        </LayoutProvider>
    );
}
