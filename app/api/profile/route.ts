import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// Helper: ambil session user yang sedang login
async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    const id = (session.user as { id?: string })?.id;
    return { session, id };
}

/**
 * GET /api/profile
 * Mengambil data profil user yang sedang login
 */
export async function GET() {
    try {
        const current = await getCurrentUser();
        if (!current?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user: any = await prisma.user.findUnique({
            where: { id: current.id },
            // @ts-ignore: Prisma client cache is out of sync but the DB contains the 'image' field
            select: { id: true, name: true, email: true, role: true, image: true, createdAt: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json({
            data: {
                ...user,
                createdAt: user.createdAt.toISOString(),
            }
        });
    } catch (error: any) {
        require('fs').appendFileSync('error.log', 'GET error: ' + error.stack + '\n');
        console.error("Profile GET error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

/**
 * PATCH /api/profile
 * Update nama dan/atau password user yang sedang login
 */
export async function PATCH(req: NextRequest) {
    try {
        const current = await getCurrentUser();
        if (!current?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, currentPassword, newPassword } = await req.json();

        const user = await prisma.user.findUnique({ where: { id: current.id } });
        if (!user) {
            return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {};

        // Update nama jika ada
        if (name && name.trim() !== "") {
            updateData.name = name.trim();
        }

        // Update password jika ada
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json({ error: "Password saat ini wajib diisi" }, { status: 400 });
            }

            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });
            }

            if (newPassword.length < 6) {
                return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
            }

            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
        }

        const updated: any = await prisma.user.update({
            where: { id: current.id },
            data: updateData,
            // @ts-ignore: Prisma client cache is out of sync but the DB contains the 'image' field
            select: { id: true, name: true, email: true, role: true, image: true },
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
        require('fs').appendFileSync('error.log', 'PATCH error: ' + error.stack + '\n');
        console.error("Profile PATCH error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
