import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET Single Device
 */
export async function GET(
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

        const latestCapacity = await prisma.capacityLog.findFirst({
            where: { deviceId: id },
            orderBy: { recordedAt: "desc" },
        });

        const formatted = {
            id: device.id,
            deviceCode: device.deviceCode,
            name: device.name,
            location: device.location,
            isActive: device.isActive,
            lastPingAt: device.lastPingAt ? device.lastPingAt.toISOString() : null,
            createdAt: device.createdAt.toISOString(),
            capacity: latestCapacity ? {
                organic: latestCapacity.organicLevel,
                inorganic: latestCapacity.inorganicLevel
            } : { organic: 0, inorganic: 0 }
        };

        return NextResponse.json({ data: formatted });
    } catch (error) {
        console.error("Device API GET error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

/**
 * UPDATE Device
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const { deviceCode, name, location, isActive } = await req.json();

        // Check if device exists
        const device = await prisma.device.findUnique({ where: { id } });
        if (!device) {
            return NextResponse.json({ error: "Device not found" }, { status: 404 });
        }

        // Check if new deviceCode is taken by another device
        if (deviceCode && deviceCode !== device.deviceCode) {
            const codeExists = await prisma.device.findUnique({ where: { deviceCode } });
            if (codeExists) {
                return NextResponse.json({ error: "Device code already in use" }, { status: 400 });
            }
        }

        const updated = await prisma.device.update({
            where: { id },
            data: {
                deviceCode: deviceCode ?? undefined,
                name: name ?? undefined,
                location: location ?? undefined,
                isActive: isActive ?? undefined,
            },
        });

        // Broadcast perubahan metadata ke semua client via SSE
        const { sse } = require("@/lib/sse");
        sse.emit("data-update", {
            deviceId: updated.id,
            deviceCode: updated.deviceCode,
            deviceName: updated.name,
            type: "ping", // Gunakan tipe ping agar client memperbarui metadata mereka
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error("Device API PATCH error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

/**
 * DELETE Device
 * Note: WasteEvents and CapacityLogs will be deleted automatically 
 * due to 'onDelete: Cascade' in schema.prisma
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const device = await prisma.device.findUnique({ where: { id } });
        if (!device) {
            return NextResponse.json({ error: "Device not found" }, { status: 404 });
        }

        await prisma.device.delete({ where: { id } });

        return NextResponse.json({ success: true, message: "Device deleted" });
    } catch (error) {
        console.error("Device API DELETE error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
