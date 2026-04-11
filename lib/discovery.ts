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

    private BROADCAST_PORT = 8888; // Port untuk server menyiarkan IP-nya
    private LISTEN_PORT = 8889;    // Port untuk server mendengarkan device di sekitar
    // Subnet 192.168.150.255 (Server IP: 192.168.150.162)
    private BROADCAST_ADDR = "192.168.150.255"; 

    public start() {
        this.startBroadcaster();
        this.startListener();
    }

    private startBroadcaster() {
        if (this.broadcastSocket) return;
        this.broadcastSocket = dgram.createSocket("udp4");
        this.broadcastSocket.on("error", (err) => {
            console.error("UDP Broadcaster Error:", err);
            this.stopBroadcaster();
        });
        this.broadcastSocket.bind(() => {
            // PENTING: Harus setBroadcast agar diizinkan menyebar ke jaringan
            this.broadcastSocket?.setBroadcast(true);
            console.log("🚀 Discovery Broadcaster started on port", this.BROADCAST_PORT);
            this.broadcastInterval = setInterval(() => this.broadcast(), 5000);
        });
    }

    private startListener() {
        if (this.listenerSocket) return;
        this.listenerSocket = dgram.createSocket("udp4");
        
        this.listenerSocket.on("error", (err) => {
            console.error("UDP Listener Error:", err);
            this.stopListener();
        });

        this.listenerSocket.on("message", (msg, rinfo) => {
            try {
                const data = JSON.parse(msg.toString());
                if (data.app === "smart-waste-announce") {
                    console.log(`📡 [Nearby Discovery] Sinyal diterima dari ${data.deviceCode} (${rinfo.address})`);
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

        // Bind ke 0.0.0.0 agar mendengarkan di semua interface (WiFi, LAN, dll)
        this.listenerSocket.bind(this.LISTEN_PORT, "0.0.0.0", () => {
            console.log("👂 Discovery Listener started on port", this.LISTEN_PORT);
        });
    }

    private broadcast() {
        // Menggunakan IP yang Anda informasikan (192.168.150.162)
        const serverIp = process.env.NEXT_PUBLIC_SERVER_LOCAL_IP || "192.168.150.162";
        const serverPort = process.env.NEXT_PUBLIC_SERVER_PORT || "3000";
        
        const message = JSON.stringify({
            app: "smart-waste",
            ip: serverIp,
            port: parseInt(serverPort, 10)
        });

        this.broadcastSocket?.send(message, 0, message.length, this.BROADCAST_PORT, this.BROADCAST_ADDR);
    }

    public getNearbyDevices(): NearbyDevice[] {
        // Hapus device yang sudah tidak aktif (> 10 detik)
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
        this.broadcastSocket?.close();
        this.broadcastSocket = null;
        this.broadcastInterval = null;
    }

    private stopListener() {
        this.listenerSocket?.close();
        this.listenerSocket = null;
    }

    public stop() {
        this.stopBroadcaster();
        this.stopListener();
    }
}

const globalForDiscovery = globalThis as unknown as {
    discovery: DiscoveryService | undefined;
};

export const discovery = globalForDiscovery.discovery ?? new DiscoveryService();
if (process.env.NODE_ENV !== "production") globalForDiscovery.discovery = discovery;
