"use client";

import { useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Plus, Users, UserPlus, Pencil, Trash2, Shield, User as UserIcon } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useSession } from "next-auth/react";

interface UserItem {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "OFFICER";
    image: string | null;
    createdAt: string;
}

export default function AccountsPage() {
    const { data: session } = useSession();
    const currentUserId = (session?.user as { id?: string })?.id;

    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Form state for Create/Edit
    const [formData, setFormData] = useState({
        id: "",
        name: "",
        email: "",
        password: "",
        role: "OFFICER" as "ADMIN" | "OFFICER",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users");
            const json = await res.json();
            if (json.data) setUsers(json.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const resetForm = () => {
        setFormData({ id: "", name: "", email: "", password: "", role: "OFFICER" });
        setError(null);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role,
                }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Gagal membuat akun");

            setUsers([data.data, ...users]);
            setIsCreateDialogOpen(false);
            resetForm();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch(`/api/users/${formData.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    password: formData.password || undefined,
                }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Gagal memperbarui akun");

            setUsers(users.map((u) => (u.id === formData.id ? data.data : u)));
            setIsEditDialogOpen(false);
            resetForm();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus akun ini?")) return;
        setIsDeleting(id);

        try {
            const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal menghapus akun");
            }
            setUsers(users.filter((u) => u.id !== id));
        } catch (err) {
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setIsDeleting(null);
        }
    };

    const openEditDialog = (user: UserItem) => {
        setFormData({
            id: user.id,
            name: user.name,
            email: user.email,
            password: "", // Jangan tampilkan password
            role: user.role,
        });
        setIsEditDialogOpen(true);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Kelola Akun</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manajemen akses admin dan petugas unit Smart Waste.</p>
                </div>

                <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                    setIsCreateDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700 text-white shadow-md">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Tambah Akun
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Tambah Akun Baru</DialogTitle>
                            <DialogDescription>
                                Berikan akses sistem kepada personil baru.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate}>
                            <div className="grid gap-4 py-4">
                                {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg dark:bg-red-950/30">{error}</div>}

                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nama Lengkap</Label>
                                    <Input
                                        id="name"
                                        placeholder="Nama personil"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="email@contoh.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Min. 6 karakter"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="role">Role / Akses</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(val) => setFormData({ ...formData, role: val as any })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="OFFICER">Petugas (Officer)</SelectItem>
                                            <SelectItem value="ADMIN">Administrator</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
                                    Batal
                                </Button>
                                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                                    {isSubmitting ? "Menyimpan..." : "Simpan Akun"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-transparent sm:bg-white sm:dark:bg-slate-900 rounded-none sm:rounded-xl border-none sm:border sm:border-slate-100 sm:dark:border-slate-800 shadow-none sm:shadow-sm overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent bg-slate-50/50 dark:bg-slate-800/50">
                                <TableHead className="w-[200px]">Nama</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Dibuat Pada</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array(5).fill(0).map((_, j) => (
                                            <TableCell key={j}><div className="h-5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                        Belum ada akun terdaftar.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id} className="group transition-colors border-slate-100 dark:border-slate-800/50">
                                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                                            <div className="flex items-center gap-3">
                                                {user.image ? (
                                                    <img 
                                                        src={user.image} 
                                                        alt={user.name} 
                                                        className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover bg-white" 
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                                        <UserIcon className="w-4 h-4" />
                                                    </div>
                                                )}
                                                {user.name}
                                                {user.id === currentUserId && (
                                                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-green-200 text-green-600 bg-green-50 dark:bg-green-950/30">Anda</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-400">{user.email}</TableCell>
                                        <TableCell>
                                            {user.role === "ADMIN" ? (
                                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-500 border-none font-medium flex w-fit items-center gap-1">
                                                    <Shield className="w-3 h-3" />
                                                    Admin
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border-none font-medium w-fit">
                                                    Petugas
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-500 dark:text-slate-500 text-xs">
                                            {formatRelativeTime(user.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                    onClick={() => openEditDialog(user)}
                                                    title="Edit Akun"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    onClick={() => handleDelete(user.id)}
                                                    disabled={user.id === currentUserId || isDeleting === user.id}
                                                    title={user.id === currentUserId ? "Tidak bisa menghapus diri sendiri" : "Hapus Akun"}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Cards View */}
                <div className="block sm:hidden space-y-3">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                                <LoadingSkeleton />
                            </div>
                        ))
                    ) : users.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm text-center text-slate-500">
                            Belum ada akun terdaftar.
                        </div>
                    ) : (
                        users.map((user) => (
                            <div key={user.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        {user.image ? (
                                            <img
                                                src={user.image}
                                                alt={user.name}
                                                className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 object-cover bg-white shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                                <UserIcon className="w-5 h-5" />
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{user.name}</span>
                                                {user.id === currentUserId && (
                                                    <Badge variant="outline" className="text-[9px] py-0 h-4 border-green-200 text-green-600 bg-green-50 dark:bg-green-950/30">Anda</Badge>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
                                        </div>
                                    </div>
                                    {user.role === "ADMIN" ? (
                                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500 border-none font-medium flex gap-1 h-6 shrink-0">
                                            <Shield className="w-3 h-3 hidden xs:block" />
                                            Admin
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-none font-medium text-xs h-6 shrink-0">
                                            Petugas
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800/50">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                        Dibuat: {new Date(user.createdAt).toLocaleDateString('id-ID')}
                                    </span>
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-7 px-2 text-xs text-slate-600 dark:text-slate-300"
                                            onClick={() => openEditDialog(user)}
                                        >
                                            <Pencil className="w-3 h-3 mr-1" /> Edit
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => handleDelete(user.id)}
                                            disabled={user.id === currentUserId || isDeleting === user.id}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (!open) resetForm();
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Akun</DialogTitle>
                        <DialogDescription>
                            Perbarui informasi akun atau ganti role user.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate}>
                        <div className="grid gap-4 py-4">
                            {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg dark:bg-red-950/30">{error}</div>}

                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Nama Lengkap</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-password">Password Baru (Opsional)</Label>
                                <Input
                                    id="edit-password"
                                    type="password"
                                    placeholder="Kosongkan jika tidak diganti"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-role">Role / Akses</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(val) => setFormData({ ...formData, role: val as any })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OFFICER">Petugas (Officer)</SelectItem>
                                        <SelectItem value="ADMIN">Administrator</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
                                Batal
                            </Button>
                            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
