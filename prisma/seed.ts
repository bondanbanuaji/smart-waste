import { prisma } from "../lib/db";
import * as bcrypt from "bcryptjs";

async function main() {
    console.log("🌱 Seeding database...");

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await prisma.user.upsert({
        where: { email: "admin@smarttrash.com" },
        update: {},
        create: {
            name: "Administrator",
            email: "admin@smarttrash.com",
            password: adminPassword,
            role: "ADMIN",
        },
    });
    console.log(`✅ Admin created: ${admin.email}`);

    // Create officer user
    const officerPassword = await bcrypt.hash("petugas123", 10);
    const officer = await prisma.user.upsert({
        where: { email: "petugas@smarttrash.com" },
        update: {},
        create: {
            name: "Petugas Kebersihan",
            email: "petugas@smarttrash.com",
            password: officerPassword,
            role: "OFFICER",
        },
    });
    console.log(`✅ Officer created: ${officer.email}`);

    // Create default device
    const device = await prisma.device.upsert({
        where: { deviceCode: "ESP32-01" },
        update: {},
        create: {
            deviceCode: "ESP32-01",
            name: "Ruang Kelas A",
            location: "Gedung B Lt. 2",
            isActive: true,
        },
    });
    console.log(`✅ Device created: ${device.deviceCode} — ${device.name}`);

    // Create some sample data for the device
    const now = new Date();
    const sampleEvents = [];
    const sampleCapacities = [];

    for (let i = 0; i < 20; i++) {
        const hoursAgo = new Date(now.getTime() - i * 60 * 60 * 1000);
        const isOrganic = Math.random() > 0.4;
        sampleEvents.push({
            deviceId: device.id,
            wasteType: isOrganic ? "ORGANIC" as const : "INORGANIC" as const,
            moistureValue: isOrganic ? 500 + Math.random() * 500 : Math.random() * 499,
            detectedAt: hoursAgo,
        });
        sampleCapacities.push({
            deviceId: device.id,
            organicLevel: Math.min(100, Math.floor(20 + i * 3.5 + Math.random() * 5)),
            inorganicLevel: Math.min(100, Math.floor(15 + i * 2.5 + Math.random() * 5)),
            recordedAt: hoursAgo,
        });
    }

    await prisma.wasteEvent.createMany({ data: sampleEvents });
    await prisma.capacityLog.createMany({ data: sampleCapacities });
    console.log(`✅ Created ${sampleEvents.length} sample waste events`);
    console.log(`✅ Created ${sampleCapacities.length} sample capacity logs`);

    console.log("\n🎉 Seeding complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
