"use client";

import { useEffect } from "react";
import { SSEDataUpdate } from "@/types";

export function useSSE(onDataUpdate: (data: SSEDataUpdate) => void) {
    useEffect(() => {
        let eventSource: EventSource | null = null;
        let retryCount = 0;
        const maxRetries = 5;

        const connectSSE = () => {
            eventSource = new EventSource("/api/sse");

            eventSource.addEventListener("data-update", (event: any) => {
                try {
                    const data: SSEDataUpdate = JSON.parse(event.data);
                    onDataUpdate(data);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount
}
