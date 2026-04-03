import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const devices = await prisma.device.findMany();

        // We get latest capacity for each device
        const devicesWithCapacity = await Promise.all(
            devices.map(async (device) => {
                const latestCapacity = await prisma.capacityLog.findFirst({
                    where: { deviceId: device.id },
                    orderBy: { recordedAt: "desc" },
                });

                return {
                    id: device.id,
                    deviceCode: device.deviceCode,
                    name: device.name,
                    location: device.location,
                    isActive: device.isActive,
                    lastPingAt: device.lastPingAt ? device.lastPingAt.toISOString() : null,
                    latestCapacity: latestCapacity
                        ? {
                            organicLevel: latestCapacity.organicLevel,
                            inorganicLevel: latestCapacity.inorganicLevel,
                            recordedAt: latestCapacity.recordedAt.toISOString(),
                        }
                        : null,
                };
            })
        );

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

        const totalEventToday = await prisma.wasteEvent.count({
            where: { detectedAt: { gte: startOfToday } },
        });

        const totalOrganicToday = await prisma.wasteEvent.count({
            where: { detectedAt: { gte: startOfToday }, wasteType: "ORGANIC" },
        });

        const totalInorganicToday = totalEventToday - totalOrganicToday;

        const totalEventThisWeek = await prisma.wasteEvent.count({
            where: { detectedAt: { gte: startOfWeek } },
        });

        // 7-Days Chart Data Aggregation
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentEvents = await prisma.wasteEvent.findMany({
            where: { detectedAt: { gte: sevenDaysAgo } },
            select: { detectedAt: true, wasteType: true }
        });

        // Initialize array with last 7 days (formatted in id-ID locale)
        const weeklyDataMap = new Map();
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const label = d.toLocaleDateString('id-ID', { weekday: 'short' });
            weeklyDataMap.set(label, { label, organic: 0, inorganic: 0 });
        }

        // Populate counts
        recentEvents.forEach(event => {
            const label = event.detectedAt.toLocaleDateString('id-ID', { weekday: 'short' });
            if (weeklyDataMap.has(label)) {
                const dayData = weeklyDataMap.get(label);
                if (event.wasteType === 'ORGANIC') dayData.organic += 1;
                else dayData.inorganic += 1;
            }
        });

        const weeklyChartData = Array.from(weeklyDataMap.values());

        const unreadNotificationCount = await prisma.notification.count({
            where: { isRead: false },
        });

        return NextResponse.json({
            devices: devicesWithCapacity,
            stats: {
                totalEventToday,
                totalOrganicToday,
                totalInorganicToday,
                totalEventThisWeek,
                weeklyChartData,
            },
            unreadNotificationCount,
        });
    } catch (error) {
        console.error("Dashboard API error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
