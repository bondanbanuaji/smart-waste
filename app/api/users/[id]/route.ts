import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// Helper: check if current user is ADMIN, returns session with user id
async function assertAdmin() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string })?.role;
    const id = (session?.user as { id?: string })?.id;
    if (!session || role !== "ADMIN") {
        return null;
    }
    return { ...session, userId: id };
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await assertAdmin();
        if (!session) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const { name, email, password, role } = await req.json();

        if (!name || !email || !role) {
            return NextResponse.json({ error: "Nama, email, dan role harus diisi" }, { status: 400 });
        }

        if (!["ADMIN", "OFFICER"].includes(role)) {
            return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
        }

        // Check if user exists
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
        }

        // Check email uniqueness (if changed)
        if (email !== existing.email) {
            const emailTaken = await prisma.user.findUnique({ where: { email } });
            if (emailTaken) {
                return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
            }
        }

        // Build update data
        const updateData: { name: string; email: string; role: "ADMIN" | "OFFICER"; password?: string } = {
            name,
            email,
            role,
        };

        // Only hash and update password if provided
        if (password && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });

        return NextResponse.json({
            success: true,
            data: { ...updatedUser, createdAt: updatedUser.createdAt.toISOString() },
        });
    } catch (error) {
        console.error("Users API PUT error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await assertAdmin();
        if (!session) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        // Prevent self-deletion
        if (session.userId === id) {
            return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
        }

        await prisma.user.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Users API DELETE error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
