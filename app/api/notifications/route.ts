import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const isReadParam = searchParams.get("isRead");

        const where: Record<string, unknown> = {};
        if (isReadParam !== null) {
            where.isRead = isReadParam === "true";
        }

        const notifications = await prisma.notification.findMany({
            where,
            include: {
                device: { select: { name: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        const formattedData = notifications.map((n: { id: string; device: { name: string }; wadahType: string; capacityValue: number; isRead: boolean; createdAt: Date }) => ({
            id: n.id,
            deviceName: n.device.name,
            wadahType: n.wadahType,
            capacityValue: n.capacityValue,
            isRead: n.isRead,
            createdAt: n.createdAt.toISOString(),
        }));

        return NextResponse.json({ data: formattedData });
    } catch (error) {
        console.error("Notifications API GET error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { ids, markAll } = await req.json();

        if (markAll) {
            await prisma.notification.updateMany({
                where: { isRead: false },
                data: { isRead: true },
            });
            return NextResponse.json({ success: true, message: "All marked as read" });
        }

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No ids provided" }, { status: 400 });
        }

        await prisma.notification.updateMany({
            where: { id: { in: ids } },
            data: { isRead: true },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Notifications API PATCH error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
