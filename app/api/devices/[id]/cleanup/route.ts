import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sse } from "@/lib/sse";
import { SSEDataUpdate } from "@/types";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const device = await prisma.device.findUnique({
            where: { id },
        });

        if (!device) {
            return NextResponse.json({ error: "Device not found" }, { status: 404 });
        }

        // 1. Reset capacity by creating a new log with 0 levels
        await prisma.capacityLog.create({
            data: {
                deviceId: id,
                organicLevel: 0,
                inorganicLevel: 0,
            },
        });

        // 2. Mark unread CAPACITY_FULL notifications as read for this device
        await prisma.notification.updateMany({
            where: {
                deviceId: id,
                type: "CAPACITY_FULL",
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });

        // 3. Emit SSE update
        const updateData: SSEDataUpdate = {
            deviceId: device.id,
            deviceCode: device.deviceCode,
            deviceName: device.name,
            type: "cleanup",
            organicLevel: 0,
            inorganicLevel: 0,
            lastPingAt: new Date().toISOString(),
        };

        sse.emit("data-update", updateData);

        return NextResponse.json({ success: true, message: "Device cleaned successfully" });
    } catch (error) {
        console.error("Cleanup API error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
