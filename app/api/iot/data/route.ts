import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sse } from "@/lib/sse";
import { IoTPayload, SSEDataUpdate, WadahType } from "@/types";

export async function POST(req: NextRequest) {
    try {
        const payload: IoTPayload = await req.json();

        const {
            deviceCode,
            type = "event", // Default ke event jika tidak ada
            wasteType,
            moistureValue,
            organicLevel,
            inorganicLevel,
        } = payload;

        if (!deviceCode) {
            return NextResponse.json({ success: false, error: "Invalid payload: deviceCode missing" }, { status: 400 });
        }

        const device = await prisma.device.findUnique({
            where: { deviceCode },
        });

        if (!device) {
            return NextResponse.json({ success: false, error: "Device not found" }, { status: 404 });
        }

        // 1. Update last ping (Berlaku untuk Event maupun Ping)
        await prisma.device.update({
            where: { id: device.id },
            data: { lastPingAt: new Date() },
        });

        // Jika hanya PING, kirim SSE dan return
        if (type === "ping") {
            const pingUpdate: SSEDataUpdate = {
                deviceId: device.id,
                deviceCode: device.deviceCode,
                type: "ping",
            };
            sse.emit("data-update", pingUpdate);
            return NextResponse.json({ success: true, message: "Heartbeat received" });
        }

        // Validasi payload lengkap jika tipe adalah 'event'
        if (!wasteType || organicLevel === undefined || inorganicLevel === undefined) {
            return NextResponse.json({ success: false, error: "Invalid payload for event type" }, { status: 400 });
        }

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
        let notificationId: string | undefined;
        let notificationCreatedAt: string | undefined;
        let capacityValue: number | undefined;

        // Check organic
        if (organicLevel >= ALERT_THRESHOLD) {
            const existingUnread = await prisma.notification.findFirst({
                where: { deviceId: device.id, wadahType: "ORGANIC", isRead: false },
            });
            if (!existingUnread) {
                const newNotif = await prisma.notification.create({
                    data: {
                        deviceId: device.id,
                        wadahType: "ORGANIC",
                        capacityValue: organicLevel,
                        type: "CAPACITY_FULL",
                    },
                });
                hasAlert = true;
                alertWadah = "ORGANIC";
                notificationId = newNotif.id;
                notificationCreatedAt = newNotif.createdAt.toISOString();
                capacityValue = organicLevel;
            }
        }

        // Check inorganic
        if (inorganicLevel >= ALERT_THRESHOLD) {
            const existingUnread = await prisma.notification.findFirst({
                where: { deviceId: device.id, wadahType: "INORGANIC", isRead: false },
            });
            if (!existingUnread) {
                const newNotif = await prisma.notification.create({
                    data: {
                        deviceId: device.id,
                        wadahType: "INORGANIC",
                        capacityValue: inorganicLevel,
                        type: "CAPACITY_FULL",
                    },
                });
                hasAlert = true;
                alertWadah = "INORGANIC";
                notificationId = newNotif.id;
                notificationCreatedAt = newNotif.createdAt.toISOString();
                capacityValue = inorganicLevel;
            }
        }

        // 5. Broadcast SSE
        const updateData: SSEDataUpdate = {
            deviceId: device.id,
            deviceCode: device.deviceCode,
            deviceName: device.name,
            type: "event",
            organicLevel,
            inorganicLevel,
            wasteType,
            moistureValue,
            hasAlert,
            alertWadah,
            notificationId,
            notificationCreatedAt,
            capacityValue,
        };

        sse.emit("data-update", updateData);

        return NextResponse.json({ success: true, eventId: wasteEvent.id });
    } catch (error) {
        console.error("IoT Event processing error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
