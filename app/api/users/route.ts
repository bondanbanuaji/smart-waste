import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// Helper: check if current user is ADMIN
async function assertAdmin() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string })?.role;
    if (!session || role !== "ADMIN") {
        return null;
    }
    return session;
}

export async function GET() {
    try {
        const session = await assertAdmin();
        if (!session) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });

        const formatted = users.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
        }));

        return NextResponse.json({ data: formatted });
    } catch (error) {
        console.error("Users API GET error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await assertAdmin();
        if (!session) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { name, email, password, role } = await req.json();

        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: "Semua field harus diisi" }, { status: 400 });
        }

        if (!["ADMIN", "OFFICER"].includes(role)) {
            return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
        }

        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) {
            return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: { name, email, password: hashedPassword, role },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });

        return NextResponse.json({
            success: true,
            data: { ...newUser, createdAt: newUser.createdAt.toISOString() },
        });
    } catch (error) {
        console.error("Users API POST error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
