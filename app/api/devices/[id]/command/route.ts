import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { discovery } from "@/lib/discovery";
import axios from "axios";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await req.json();
        const { command } = body;

        if (!command || !["OPEN_ORGANIC", "OPEN_INORGANIC", "CLOSE"].includes(command)) {
            return NextResponse.json({ error: "Invalid command" }, { status: 400 });
        }

        // 1. Cari device di Database
        const device = await prisma.device.findUnique({
            where: { id }
        });

        if (!device) {
            return NextResponse.json({ error: "Device not found in database" }, { status: 404 });
        }

        // 2. Cari IP Bridge dari hasil scan/discovery network UDP
        const activeDevices = discovery.getNearbyDevices();
        const bridgeDevice = activeDevices.find(d => d.deviceCode === device.deviceCode);

        // Fallback ke status online terakhir di DB tapi idealnya butuh local IP yang presisi
        if (!bridgeDevice) {
             return NextResponse.json({ 
                 error: "Device is currently offline or not detected on local network. Ensure serial_bridge.js is running." 
             }, { status: 503 });
        }

        // 3. Kirim HTTP POST ke lokal bridge
        const cmdUrl = `http://${bridgeDevice.ip}:8890/command`;
        
        console.log(`[API] Forwarding manual command ${command} to ${cmdUrl}`);
        
        try {
            const bridgeRes = await axios.post(cmdUrl, { command }, { timeout: 3000 });
            return NextResponse.json({ success: true, message: "Command executed successfully" });
        } catch (axiosErr) {
            console.error("Bridge communication failed:", axiosErr);
            return NextResponse.json({ 
                error: "Failed to communicate with bridge. It might have disconnected." 
            }, { status: 502 });
        }

    } catch (error) {
        console.error("Manual Override API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
