import { NextRequest } from "next/server";
import { sse } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();

    const customReadable = new ReadableStream({
        start(controller) {
            // Send initial connection successful message
            controller.enqueue(encoder.encode("event: connected\ndata: connected\n\n"));

            const dataUpdateListener = (data: unknown) => {
                const message = `event: data-update\ndata: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            sse.on("data-update", dataUpdateListener);

            req.signal.addEventListener("abort", () => {
                sse.off("data-update", dataUpdateListener);
                controller.close();
            });
        },
    });

    return new Response(customReadable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
