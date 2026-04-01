import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";


export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const deviceId = searchParams.get("deviceId");
        const type = searchParams.get("type");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};
        if (deviceId) where.deviceId = deviceId;
        if (type && (type === "ORGANIC" || type === "INORGANIC")) {
            where.wasteType = type; // assumed validated based on ENUM
        }

        const [events, total] = await Promise.all([
            prisma.wasteEvent.findMany({
                where,
                include: { device: { select: { deviceCode: true, name: true } } },
                orderBy: { detectedAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.wasteEvent.count({ where }),
        ]);

        const formattedData = events.map((e: { id: string; device: { deviceCode: string; name: string }; wasteType: string; moistureValue: number; detectedAt: Date }) => ({
            id: e.id,
            deviceCode: e.device.deviceCode,
            deviceName: e.device.name,
            wasteType: e.wasteType,
            moistureValue: e.moistureValue,
            detectedAt: e.detectedAt.toISOString(),
        }));

        return NextResponse.json({
            data: formattedData,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Events API error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
