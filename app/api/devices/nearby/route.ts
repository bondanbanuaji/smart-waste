import { NextResponse } from "next/server";
import { discovery } from "@/lib/discovery";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        // Ambil daftar device yang sedang "melempar" sinyal di jaringan
        const nearby = discovery.getNearbyDevices();

        // Ambil daftar device yang sudah terdaftar di database biar bisa kasih tanda "Sudah Ada"
        const registeredDevices = await prisma.device.findMany({
            select: { deviceCode: true }
        });
        const registeredCodes = new Set(registeredDevices.map(d => d.deviceCode));

        // Tandai mana yang sudah terdaftar dan mana yang baru
        const processedNearby = nearby.map(dev => ({
            ...dev,
            isRegistered: registeredCodes.has(dev.deviceCode)
        }));

        return NextResponse.json({ 
            success: true, 
            data: processedNearby 
        });
    } catch (error) {
        console.error("Neary Discovery API Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
