import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sse } from "@/lib/sse";
import { IoTPayload, SSEDataUpdate, WadahType } from "@/types";

export async function POST(req: NextRequest) {
    try {
        const payload: IoTPayload = await req.json();

        const {
            deviceCode,
            wasteType,
            moistureValue,
            organicLevel,
            inorganicLevel,
        } = payload;

        if (!deviceCode || !wasteType || organicLevel === undefined || inorganicLevel === undefined) {
            return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
        }

        const device = await prisma.device.findUnique({
            where: { deviceCode },
        });

        if (!device) {
            return NextResponse.json({ success: false, error: "Device not found" }, { status: 404 });
        }

        // 1. Update last ping
        await prisma.device.update({
            where: { id: device.id },
            data: { lastPingAt: new Date() },
        });

        // 2. Save waste event
        const wasteEvent = await prisma.wasteEvent.create({
            data: {
                deviceId: device.id,
                wasteType,
                moistureValue,
            },
        });

        // 3. Save capacity log
        await prisma.capacityLog.create({
            data: {
                deviceId: device.id,
                organicLevel: Math.min(100, Math.max(0, organicLevel)),
                inorganicLevel: Math.min(100, Math.max(0, inorganicLevel)),
            },
        });

        // 4. Check for alerts
        const ALERT_THRESHOLD = parseInt(process.env.CAPACITY_ALERT_THRESHOLD || "90", 10);
        let hasAlert = false;
        let alertWadah: WadahType | undefined;

        // Check organic
        if (organicLevel >= ALERT_THRESHOLD) {
            const existingUnread = await prisma.notification.findFirst({
                where: { deviceId: device.id, wadahType: "ORGANIC", isRead: false },
            });
            if (!existingUnread) {
                await prisma.notification.create({
                    data: {
                        deviceId: device.id,
                        wadahType: "ORGANIC",
                        capacityValue: organicLevel,
                        type: "CAPACITY_FULL",
                    },
                });
                hasAlert = true;
                alertWadah = "ORGANIC";
            }
        }

        // Check inorganic
        if (inorganicLevel >= ALERT_THRESHOLD) {
            const existingUnread = await prisma.notification.findFirst({
                where: { deviceId: device.id, wadahType: "INORGANIC", isRead: false },
            });
            if (!existingUnread) {
                await prisma.notification.create({
                    data: {
                        deviceId: device.id,
                        wadahType: "INORGANIC",
                        capacityValue: inorganicLevel,
                        type: "CAPACITY_FULL",
                    },
                });
                hasAlert = true;
                alertWadah = "INORGANIC";
            }
        }

        // 5. Broadcast SSE
        const updateData: SSEDataUpdate = {
            deviceId: device.id,
            deviceCode: device.deviceCode,
            organicLevel,
            inorganicLevel,
            wasteType,
            hasAlert,
            alertWadah,
        };

        sse.emit("data-update", updateData);

        return NextResponse.json({ success: true, eventId: wasteEvent.id });
    } catch (error) {
        console.error("IoT Event processing error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
