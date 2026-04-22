import dgram from "dgram";

interface NearbyDevice {
    deviceCode: string;
    ip: string;
    lastSeen: number;
    type: "BRIDGE" | "ESP32";
}

/**
 * UDP Discovery Service
 * 1. Broadcasts Server IP to help devices find the server.
 * 2. Listens for Heartbeats from devices to show them in the "Nearby Scan" UI.
 */
class DiscoveryService {
    private broadcastSocket: dgram.Socket | null = null;
    private listenerSocket: dgram.Socket | null = null;
    private broadcastInterval: NodeJS.Timeout | null = null;
    private nearbyDevices: Map<string, NearbyDevice> = new Map();
    private isStarted = false;

    private BROADCAST_PORT = 8888; // Port untuk server menyiarkan IP-nya
    private LISTEN_PORT = 8889;    // Port untuk server mendengarkan device di sekitar

    public start() {
        if (this.isStarted) return;
        this.isStarted = true;
        this.startBroadcaster();
        this.startListener();
    }

    private startBroadcaster() {
        if (this.broadcastSocket) return;
        
        try {
            this.broadcastSocket = dgram.createSocket("udp4");
            
            this.broadcastSocket.on("error", (err) => {
                console.error("UDP Broadcaster Error:", err);
                this.stopBroadcaster();
            });

            this.broadcastSocket.bind(() => {
                this.broadcastSocket?.setBroadcast(true);
                console.log("🚀 Discovery Broadcaster started on port", this.BROADCAST_PORT);
                
                if (this.broadcastInterval) clearInterval(this.broadcastInterval);
                this.broadcastInterval = setInterval(() => this.broadcast(), 2000);
            });
        } catch (err) {
            console.error("Failed to initialize UDP Broadcaster:", err);
        }
    }

    private startListener() {
        if (this.listenerSocket) return;
        
        try {
            this.listenerSocket = dgram.createSocket("udp4");
            
            this.listenerSocket.on("error", (err: any) => {
                if (err.code === "EADDRINUSE") {
                    console.warn(`⚠️ Discovery Listener: Port ${this.LISTEN_PORT} already in use. Skipping listener.`);
                } else {
                    console.error("UDP Listener Error:", err);
                }
                this.stopListener();
            });

            this.listenerSocket.on("message", (msg, rinfo) => {
                try {
                    const data = JSON.parse(msg.toString());
                    if (data.app === "smart-waste-announce") {
                        this.nearbyDevices.set(data.deviceCode, {
                            deviceCode: data.deviceCode,
                            ip: rinfo.address,
                            lastSeen: Date.now(),
                            type: data.type || "BRIDGE"
                        });
                    }
                } catch (e) {
                    // Ignore non-json or invalid messages
                }
            });

            // Bind ke 0.0.0.0 agar mendengarkan di semua interface
            this.listenerSocket.bind(this.LISTEN_PORT, "0.0.0.0", () => {
                console.log("👂 Discovery Listener started on port", this.LISTEN_PORT);
            });
        } catch (err) {
            console.error("Failed to initialize UDP Listener:", err);
        }
    }

    private getBroadcastAddr(): string {
        const serverIp = process.env.NEXT_PUBLIC_SERVER_LOCAL_IP || "192.168.1.1";
        const parts = serverIp.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.255`;
        }
        return "255.255.255.255";
    }

    private broadcast() {
        if (!this.broadcastSocket) return;

        const serverIp = process.env.NEXT_PUBLIC_SERVER_LOCAL_IP || "192.168.1.1";
        const serverPort = process.env.NEXT_PUBLIC_SERVER_PORT || "3000";
        const primaryBroadcastAddr = this.getBroadcastAddr();
        
        const message = JSON.stringify({
            app: 'smart-waste',
            ip: serverIp,
            port: parseInt(serverPort, 10)
        });

        const sendTo = (addr: string, isFallback = false) => {
            this.broadcastSocket?.send(message, 0, message.length, this.BROADCAST_PORT, addr, (err) => {
                if (err) {
                    if (!isFallback && (err as any).code === 'ENETUNREACH') {
                        // Fallback to global broadcast if subnet broadcast fails
                        sendTo("255.255.255.255", true);
                    } else if (isFallback) {
                        // Silent fail on fallback to avoid log pollution
                    } else {
                        console.error(`UDP Broadcast send error (${addr}):`, err);
                    }
                }
            });
        };

        sendTo(primaryBroadcastAddr);
    }

    public getNearbyDevices(): NearbyDevice[] {
        const now = Date.now();
        this.nearbyDevices.forEach((dev, code) => {
            if (now - dev.lastSeen > 10000) {
                this.nearbyDevices.delete(code);
            }
        });
        return Array.from(this.nearbyDevices.values());
    }

    private stopBroadcaster() {
        if (this.broadcastInterval) clearInterval(this.broadcastInterval);
        try {
            this.broadcastSocket?.close();
        } catch (e) {}
        this.broadcastSocket = null;
        this.broadcastInterval = null;
    }

    private stopListener() {
        try {
            this.listenerSocket?.close();
        } catch (e) {}
        this.listenerSocket = null;
    }

    public stop() {
        this.isStarted = false;
        this.stopBroadcaster();
        this.stopListener();
    }
}

const globalForDiscovery = globalThis as unknown as {
    discovery: DiscoveryService | undefined;
};

export const discovery = globalForDiscovery.discovery ?? new DiscoveryService();
if (process.env.NODE_ENV !== "production") globalForDiscovery.discovery = discovery;
