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
            bridgeIp,       // IP yang dikirim oleh bridge secara eksplisit
        } = payload;

        // Prioritas IP: 
        // 1. bridgeIp dari payload (paling akurat, dikirim langsung oleh bridge)
        // 2. x-forwarded-for / x-real-ip dari header HTTP
        // 3. Fallback ke 127.0.0.1
        let resolvedIp = bridgeIp || null;

        if (!resolvedIp) {
            let headerIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                           req.headers.get("x-real-ip") || 
                           "127.0.0.1";
            if (headerIp.includes("::ffff:")) headerIp = headerIp.replace("::ffff:", "");
            if (headerIp !== "127.0.0.1" && headerIp !== "::1") {
                resolvedIp = headerIp;
            }
        }

        console.log(`[IoT API] deviceCode: ${deviceCode}, bridgeIp: ${bridgeIp || 'N/A'}, resolvedIp: ${resolvedIp || 'none'}`);

        // 1. Ambil atau buat device secara otomatis (Auto-Registration)
        // Hanya update lastKnownIp jika kita punya IP yang valid
        const device = await prisma.device.upsert({
            where: { deviceCode },
            update: { 
                lastPingAt: new Date(),
                ...(resolvedIp ? { lastKnownIp: resolvedIp } : {})
            },
            create: {
                deviceCode,
                name: deviceCode,
                location: "Lokasi belum ditentukan",
                isActive: true,
                ...(resolvedIp ? { lastKnownIp: resolvedIp } : {}),
                lastPingAt: new Date(),
            },
        });

        // Jika hanya PING, kirim SSE dan return
        if (type === "ping") {
            const pingUpdate: SSEDataUpdate = {
                deviceId: device.id,
                deviceCode: device.deviceCode,
                type: "ping",
                lastPingAt: new Date().toISOString(),
            };
            sse.emit("data-update", pingUpdate);
            return NextResponse.json({ success: true, message: "Heartbeat received" });
        }

        // Jika OFFLINE (Signal dari bridge saat dimatikan)
        if (type === "offline") {
            await prisma.device.update({
                where: { id: device.id },
                data: { lastPingAt: new Date(0) }, // Set to Unix Epoch (1970) to force offline
            });
            
            const offlineUpdate: SSEDataUpdate = {
                deviceId: device.id,
                deviceCode: device.deviceCode,
                type: "ping", // Use ping type to trigger status update in UI
                lastPingAt: new Date(0).toISOString(),
            };
            sse.emit("data-update", offlineUpdate);
            return NextResponse.json({ success: true, message: "Device set to offline" });
        }

        // Validasi payload lengkap jika tipe adalah 'event'
        if (!wasteType) {
            console.error("❌ [IoT API] Missing wasteType in payload:", payload);
            return NextResponse.json({ success: false, error: "Invalid payload: wasteType missing" }, { status: 400 });
        }

        // Definisikan level dengan default 0 jika tidak dikirim dari hardware (Backward Compatibility)
        const safeOrganicLevel = organicLevel ?? 0;
        const safeInorganicLevel = inorganicLevel ?? 0;

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
                organicLevel: Math.min(100, Math.max(0, safeOrganicLevel)),
                inorganicLevel: Math.min(100, Math.max(0, safeInorganicLevel)),
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
        if (safeOrganicLevel >= ALERT_THRESHOLD) {
            const existingUnread = await prisma.notification.findFirst({
                where: { deviceId: device.id, wadahType: "ORGANIC", isRead: false },
            });
            
            hasAlert = true;
            alertWadah = "ORGANIC";
            capacityValue = safeOrganicLevel;

            if (!existingUnread) {
                const newNotif = await prisma.notification.create({
                    data: {
                        deviceId: device.id,
                        wadahType: "ORGANIC",
                        capacityValue: safeOrganicLevel,
                        type: "CAPACITY_FULL",
                    },
                });
                notificationId = newNotif.id;
                notificationCreatedAt = newNotif.createdAt.toISOString();
            } else {
                notificationId = existingUnread.id;
                notificationCreatedAt = existingUnread.createdAt.toISOString();
            }
        }

        // Check inorganic
        if (safeInorganicLevel >= ALERT_THRESHOLD) {
            const existingUnread = await prisma.notification.findFirst({
                where: { deviceId: device.id, wadahType: "INORGANIC", isRead: false },
            });

            hasAlert = true;
            alertWadah = "INORGANIC";
            capacityValue = safeInorganicLevel;

            if (!existingUnread) {
                const newNotif = await prisma.notification.create({
                    data: {
                        deviceId: device.id,
                        wadahType: "INORGANIC",
                        capacityValue: safeInorganicLevel,
                        type: "CAPACITY_FULL",
                    },
                });
                notificationId = newNotif.id;
                notificationCreatedAt = newNotif.createdAt.toISOString();
            } else {
                notificationId = existingUnread.id;
                notificationCreatedAt = existingUnread.createdAt.toISOString();
            }
        }

        // 5. Broadcast SSE
        const updateData: SSEDataUpdate = {
            deviceId: device.id,
            deviceCode: device.deviceCode,
            deviceName: device.name,
            type: "event",
            organicLevel: safeOrganicLevel,
            inorganicLevel: safeInorganicLevel,
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
