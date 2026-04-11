"use client";

import { useEffect, useCallback, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

/**
 * Komponen Tracker Inaktivitas
 * Jika tidak ada gerakan mouse, klik, atau ketikan selama 30 menit,
 * sistem akan otomatis logout.
 */
export default function InactivityLogout() {
    const { status } = useSession();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Konfigurasi: 30 menit (dalam milidetik)
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

    const handleLogout = useCallback(() => {
        if (status === "authenticated") {
            console.log("Inactivity detected. Logging out...");
            signOut({ callbackUrl: "/login", redirect: true });
        }
    }, [status]);

    const resetTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
    }, [handleLogout, INACTIVITY_TIMEOUT]);

    useEffect(() => {
        // Hanya jalankan tracker jika user sudah login
        if (status !== "authenticated") return;

        // Daftar event yang dianggap sebagai "Aktivitas"
        const events = [
            "mousedown",
            "mousemove",
            "keypress",
            "scroll",
            "touchstart",
        ];

        // Inisialisasi timer pertama kali
        resetTimer();

        // Tambahkan event listener ke window
        events.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        // Cleanup saat komponen unmount
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [status, resetTimer]);

    // Komponen ini tidak me-render apa pun secara visual
    return null;
}
