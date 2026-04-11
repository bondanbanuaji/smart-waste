import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const devices = await prisma.device.findMany({
            orderBy: { createdAt: "desc" },
        });

        // Quick transform for dates to ISO strings for client compatibility
        const formatted = devices.map(d => ({
            ...d,
            lastPingAt: d.lastPingAt?.toISOString() || null,
            createdAt: d.createdAt.toISOString(),
        }));

        return NextResponse.json({ data: formatted });
    } catch (error) {
        console.error("Devices API GET error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { deviceCode, name, location } = await req.json();

        if (!deviceCode || !name || !location) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const exists = await prisma.device.findUnique({ where: { deviceCode } });
        if (exists) {
            return NextResponse.json({ error: "Device code already exists" }, { status: 400 });
        }

        const newDevice = await prisma.device.create({
            data: {
                deviceCode,
                name,
                location,
                isActive: true,
                lastPingAt: new Date(), // Langsung set online saat pertama ditambahkan!
            },
        });

        return NextResponse.json({ success: true, data: { ...newDevice, createdAt: newDevice.createdAt.toISOString(), lastPingAt: newDevice.lastPingAt?.toISOString() } });
    } catch (error) {
        console.error("Devices API POST error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
