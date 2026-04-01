import { EventEmitter } from "events";


class SSEEmitter extends EventEmitter { }

const globalForSSE = globalThis as unknown as {
    sse: SSEEmitter | undefined;
};

export const sse = globalForSSE.sse ?? new SSEEmitter();
sse.setMaxListeners(100);

if (process.env.NODE_ENV !== "production") globalForSSE.sse = sse;
