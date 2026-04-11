import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = (session.user as { id?: string })?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("avatar") as File | null;

        if (!file) {
            return NextResponse.json({ error: "Tidak ada file yang dikirim" }, { status: 400 });
        }

        // Validasi tipe file
        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json({ error: "Format file tidak valid. Gunakan JPG, PNG, WEBP, atau GIF." }, { status: 400 });
        }

        // Validasi ukuran file (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ error: "Ukuran file maksimal 2MB" }, { status: 400 });
        }

        // Buat nama file unik
        const originalName = file.name || "avatar.webp";
        const ext = originalName.split(".").pop() || "webp";
        const filename = `${userId}-${Date.now()}.${ext}`;
        const uploadDir = join(process.cwd(), "public", "uploads", "avatars");
        const filePath = join(uploadDir, filename);

        // Pastikan folder tersedia
        await mkdir(uploadDir, { recursive: true });

        // Simpan file ke disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        const imageUrl = `/uploads/avatars/${filename}`;

        // Update database
        await prisma.user.update({
            where: { id: userId },
            data: { image: imageUrl } as any,
        });

        return NextResponse.json({ success: true, imageUrl });
    } catch (error: any) {
        require('fs').appendFileSync('error.log', 'Avatar POST error: ' + error.stack + '\n');
        console.error("Avatar upload error:", error);
        return NextResponse.json({ error: "Gagal mengupload foto" }, { status: 500 });
    }
}
