"use client";

import { useEffect, useRef } from "react";
import { SSEDataUpdate } from "@/types";

export function useSSE(onDataUpdate: (data: SSEDataUpdate) => void) {
    // Gunakan ref untuk menyimpan handler terbaru agar tidak terjadi stale closure
    // dalam event listener SSE tanpa perlu me-restart koneksi EventSource.
    const handlerRef = useRef(onDataUpdate);

    useEffect(() => {
        handlerRef.current = onDataUpdate;
    }, [onDataUpdate]);

    useEffect(() => {
        let eventSource: EventSource | null = null;
        let retryCount = 0;
        const maxRetries = 5;

        const connectSSE = () => {
            // Pastikan menggunakan path absolut agar tidak bermasalah di nested routes
            eventSource = new EventSource("/api/sse");

            eventSource.addEventListener("data-update", (event: any) => {
                try {
                    const data: SSEDataUpdate = JSON.parse(event.data);
                    // Panggil handler dari ref yang selalu up-to-date
                    if (handlerRef.current) {
                        handlerRef.current(data);
                    }
                } catch (err) {
                    console.error("Failed to parse SSE data", err);
                }
            });

            eventSource.onerror = () => {
                console.error("SSE Connection Error. Attempting to reconnect...");
                eventSource?.close();
                if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(connectSSE, 3000 * retryCount); // Exponential backoff
                }
            };

            eventSource.onopen = () => {
                retryCount = 0;
                console.log("SSE Connected");
            };
        };

        connectSSE();

        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
        // Dependency array kosong agar EventSource TIDAK restart saat onDataUpdate berubah
    }, []); 
}
