import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

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
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans selection:bg-green-200">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header />
                <main className="flex-1 overflow-y-auto p-8 relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
