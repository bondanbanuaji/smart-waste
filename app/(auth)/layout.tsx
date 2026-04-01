import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-300">
            {/* Decorative background elements matching the sleek aesthetic */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-green-500/10 to-blue-500/5 dark:from-green-500/20 dark:to-blue-500/10 -z-10 rounded-b-[100%]" />
            <div className="absolute bottom-10 left-10 w-72 h-72 bg-green-400/20 dark:bg-green-400/10 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="absolute top-20 right-20 w-96 h-96 bg-blue-400/10 dark:bg-blue-400/5 rounded-full blur-3xl -z-10" />

            {children}
        </div>
    );
}
