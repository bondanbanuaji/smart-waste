import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const deviceId = searchParams.get("deviceId");
        const range = searchParams.get("range") || "today";

        if (!deviceId) {
            return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const fromDate = new Date(today);

        if (range === "week") {
            fromDate.setDate(today.getDate() - 7);
        } else if (range === "month") {
            fromDate.setMonth(today.getMonth() - 1);
        }

        const data = await prisma.capacityLog.findMany({
            where: {
                deviceId,
                recordedAt: { gte: fromDate },
            },
            orderBy: { recordedAt: "asc" },
            // Subsampling should ideally happen here or post-processing, but for simplicity we return all
        });

        const formattedData = data.map((log: { recordedAt: Date; organicLevel: number; inorganicLevel: number }) => ({
            time: log.recordedAt.toISOString(),
            organicLevel: log.organicLevel,
            inorganicLevel: log.inorganicLevel,
        }));

        // If it's today, we might want just "HH:mm" for the chart
        if (range === "today") {
            formattedData.forEach((d: { time: string; organicLevel: number; inorganicLevel: number }) => {
                const date = new Date(d.time);
                d.time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            });
        }

        return NextResponse.json({
            deviceId,
            range,
            data: formattedData,
        });
    } catch (error) {
        console.error("Capacity API error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
