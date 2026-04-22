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

        // 2. Tentukan IP Bridge
        // Prioritas 1: Ambil dari database (Last Known IP yang baru saja kita simpan)
        // Prioritas 2: Ambil dari hasil scan network UDP (Discovery)
        let targetIp = (device as any).lastKnownIp;
        
        if (!targetIp) {
            const activeDevices = discovery.getNearbyDevices();
            const bridgeDevice = activeDevices.find(d => d.deviceCode === device.deviceCode);
            if (bridgeDevice) targetIp = bridgeDevice.ip;
        }
        
        if (!targetIp) {
             return NextResponse.json({ 
                 error: "Alamat IP device belum terdeteksi. Pastikan serial_bridge.js sudah mengirim data minimal satu kali." 
             }, { status: 503 });
        }

        // 3. Kirim HTTP POST ke lokal bridge
        const cmdUrl = `http://${targetIp}:8890/command`;
        
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
