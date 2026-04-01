import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const target = new Date(date);
    const diffMs = now.getTime() - target.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "Baru saja";
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
}

export function getCapacityColor(level: number): string {
    if (level >= 90) return "text-red-500";
    if (level >= 70) return "text-yellow-500";
    return "text-green-500";
}

export function getCapacityBgColor(level: number): string {
    if (level >= 90) return "bg-red-500";
    if (level >= 70) return "bg-yellow-500";
    return "bg-green-500";
}
