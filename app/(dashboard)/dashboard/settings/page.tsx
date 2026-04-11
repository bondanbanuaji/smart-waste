"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
    User, Lock, Camera, CheckCircle2, AlertCircle,
    Eye, EyeOff, Loader2, Upload, Shield, Mail,
    Pencil, BadgeCheck, Calendar, Sparkles, Zap, Star, X
} from "lucide-react";
import Image from "next/image";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";

type TabType = "profile" | "name" | "security" | "avatar";

interface ProfileData {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "OFFICER";
    image: string | null;
    createdAt: string;
}

interface AlertState {
    type: "success" | "error";
    message: string;
}

function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function AvatarDisplay({ image, name, size = "lg" }: { image?: string | null; name: string; size?: "sm" | "lg" | "xl" }) {
    const sizeMap = { sm: "w-10 h-10 text-sm", lg: "w-28 h-28 text-3xl", xl: "w-40 h-40 text-5xl" };
    const imgSizeMap = { sm: 40, lg: 112, xl: 160 };
    const cls = sizeMap[size];

    if (image) {
        return (
            <div className={`${cls} rounded-full overflow-hidden shrink-0`}>
                <Image src={image} alt={name} width={imgSizeMap[size]} height={imgSizeMap[size]} className="object-cover w-full h-full" unoptimized />
            </div>
        );
    }
    return (
        <div className={`${cls} rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center font-black text-white shrink-0 select-none`}>
            {getInitials(name)}
        </div>
    );
}

function AlertBanner({ alert }: { alert: AlertState }) {
    const isSuccess = alert.type === "success";
    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold border animate-in slide-in-from-top-3 duration-300 ${
            isSuccess
                ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-500 dark:text-red-400"
        }`}>
            {isSuccess ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {alert.message}
        </div>
    );
}

const tabs = [
    { id: "profile" as TabType, label: "Profil", icon: User, emoji: "👤" },
    { id: "name" as TabType, label: "Ubah Nama", icon: Pencil, emoji: "✏️" },
    { id: "security" as TabType, label: "Keamanan", icon: Lock, emoji: "🔐" },
    { id: "avatar" as TabType, label: "Foto Profil", icon: Camera, emoji: "📸" },
];

export default function SettingsPage() {
    const { data: session, update: updateSession } = useSession();
    const [activeTab, setActiveTab] = useState<TabType>("profile");
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [name, setName] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | Blob | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Crop states
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imgForCrop, setImgForCrop] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alert, setAlert] = useState<AlertState | null>(null);

    const showAlert = (type: "success" | "error", message: string) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 4000);
    };

    const fetchProfile = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/profile");
            const data = await res.json();
            if (data.data) { setProfile(data.data); setName(data.data.name); }
        } catch { showAlert("error", "Gagal memuat profil"); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const handleNameUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return showAlert("error", "Nama tidak boleh kosong");
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
            const data = await res.json();
            if (!res.ok) return showAlert("error", data.error || "Gagal memperbarui nama");
            setProfile(prev => prev ? { ...prev, name: data.data.name } : prev);
            await updateSession({ name: data.data.name });
            showAlert("success", "Nama berhasil diperbarui! ✨");
        } finally { setIsSubmitting(false); }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPassword || !newPassword || !confirmPassword) return showAlert("error", "Semua kolom wajib diisi");
        if (newPassword !== confirmPassword) return showAlert("error", "Password baru tidak cocok");
        if (newPassword.length < 6) return showAlert("error", "Password baru minimal 6 karakter");
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
            const data = await res.json();
            if (!res.ok) return showAlert("error", data.error || "Gagal mengubah password");
            setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
            showAlert("success", "Password berhasil diubah! 🔐");
        } finally { setIsSubmitting(false); }
    };

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith("image/")) return showAlert("error", "File harus berupa gambar");
        if (file.size > 5 * 1024 * 1024) return showAlert("error", "Ukuran file maksimal 5MB");
        
        // Baca file gambar lalu passthrough ke react-easy-crop
        const reader = new FileReader();
        reader.onload = e => {
            setImgForCrop(e.target?.result as string);
            setCropModalOpen(true);
            setZoom(1);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = useCallback((croppedArea: any, croppedPixels: any) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const confirmCrop = async () => {
        if (!imgForCrop || !croppedAreaPixels) return;
        try {
            setIsSubmitting(true);
            const croppedBlob = await getCroppedImg(imgForCrop, croppedAreaPixels);
            if (croppedBlob) {
                setAvatarFile(croppedBlob);
                const url = URL.createObjectURL(croppedBlob);
                setAvatarPreview(url);
                setCropModalOpen(false);
            }
        } catch (e) {
            showAlert("error", "Gagal memotong gambar");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAvatarUpload = async () => {
        if (!avatarFile) return;
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("avatar", avatarFile as Blob);
            const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) return showAlert("error", data.error || "Gagal mengupload foto");
            setProfile(prev => prev ? { ...prev, image: data.imageUrl } : prev);
            setAvatarFile(null); setAvatarPreview(null);
            
            // Sync dengan NEXT AUTH Session agar seisi aplikasi reload profile pic nya
            await updateSession({ image: data.imageUrl });
            
            showAlert("success", "Foto profil berhasil diperbarui! 📸");
        } finally { setIsSubmitting(false); }
    };

    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { color: "bg-slate-300 dark:bg-slate-600", label: "", width: "w-0" };
        if (pwd.length < 6) return { color: "bg-red-500", label: "Lemah 😬", width: "w-1/4" };
        if (pwd.length < 10) return { color: "bg-yellow-500", label: "Lumayan 🤔", width: "w-2/4" };
        if (pwd.length < 14) return { color: "bg-green-500", label: "Kuat 💪", width: "w-3/4" };
        return { color: "bg-emerald-500", label: "Sangat Kuat 🔥", width: "w-full" };
    };
    const pwdStrength = getPasswordStrength(newPassword);

    const userRole = profile?.role || (session?.user as any)?.role;
    const isRoleAdmin = userRole === "ADMIN";
    const roleDisplayString = isRoleAdmin ? "Administrator" : "Petugas";

    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto pb-12 space-y-6">
                {/* Skeleton Hero */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-200 to-emerald-200 dark:from-green-900/40 dark:to-emerald-900/40">
                    <div className="px-6 py-8 sm:px-10 sm:py-12 flex flex-col sm:flex-row items-center gap-6">
                        <div className="w-28 h-28 rounded-full bg-white/40 dark:bg-white/10 animate-pulse shrink-0" />
                        <div className="space-y-3 flex-1 w-full">
                            <div className="h-3 w-24 rounded-full bg-white/40 dark:bg-white/10 animate-pulse" />
                            <div className="h-8 w-56 rounded-2xl bg-white/50 dark:bg-white/15 animate-pulse" />
                            <div className="h-3 w-40 rounded-full bg-white/30 dark:bg-white/10 animate-pulse" />
                            <div className="h-7 w-28 rounded-full bg-white/30 dark:bg-white/10 animate-pulse mt-1" />
                        </div>
                    </div>
                    {/* Shimmer sweep */}
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                {/* Skeleton Tabs */}
                <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex-1 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                    ))}
                </div>

                {/* Skeleton Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl p-6 sm:p-8 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 animate-pulse" />
                        <div className="h-6 w-32 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    </div>
                    <div className="grid gap-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl" style={{ animationDelay: `${i * 60}ms` }}>
                                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 animate-pulse shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-2.5 w-24 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                                    <div className="h-4 w-48 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="h-20 rounded-2xl bg-slate-50 dark:bg-slate-800/40 animate-pulse border border-slate-100 dark:border-slate-700" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-12">
            {/* ─── HERO BANNER ─── */}
            <div className="relative overflow-hidden rounded-3xl mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600" />
                <div className="absolute -top-10 -left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -right-10 w-80 h-80 bg-black/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 bg-lime-300/10 rounded-full blur-2xl" />

                <div className="relative px-6 py-8 sm:px-10 sm:py-12 flex flex-col sm:flex-row items-center gap-6">
                    {/* Avatar */}
                    <div className="relative shrink-0 group cursor-pointer" onClick={() => setActiveTab("avatar")}>
                        <div className="absolute inset-0 rounded-full bg-white/20 blur-xl scale-110" />
                        <div className="relative ring-4 ring-white/40 rounded-full shadow-2xl">
                            <AvatarDisplay image={avatarPreview || profile?.image} name={profile?.name || session?.user?.name || "?"} size="lg" />
                        </div>
                        <div className="absolute bottom-1 right-1 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-green-200 group-hover:scale-110 transition-transform">
                            <Camera className="w-4 h-4 text-green-600" />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="text-center sm:text-left text-white">
                        <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                            <Sparkles className="w-4 h-4 text-lime-300 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-widest text-white/70">Pengaturan Akun</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight drop-shadow-sm">
                            {profile?.name || session?.user?.name}
                        </h1>
                        <p className="text-white/70 text-sm mt-1">{profile?.email || session?.user?.email}</p>
                        <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm border ${
                            isRoleAdmin
                                ? "bg-lime-400/20 border-lime-300/40 text-lime-200"
                                : "bg-white/10 border-white/20 text-white/80"
                        }`}>
                            <Star className="w-3 h-3" />
                            {roleDisplayString}
                        </div>
                    </div>
                </div>
            </div>
            {/* ─── PILL TABS ─── */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl mb-6 backdrop-blur-sm overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setAlert(null); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 flex-1 justify-center ${
                            activeTab === tab.id
                                ? "bg-white dark:bg-slate-900 text-green-700 dark:text-green-400 shadow-md scale-[1.02]"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"
                        }`}
                    >
                        <span className="text-base">{tab.emoji}</span>
                        <span className="hidden sm:block">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ─── CONTENT CARD ─── */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">

                {/* TAB: PROFIL */}
                {activeTab === "profile" && profile && (
                    <div className="p-6 sm:p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-950/50 rounded-xl">
                                <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Info Profil</h2>
                        </div>

                        <div className="grid gap-3">
                            {[
                                { icon: User,     label: "Nama Lengkap",   value: profile.name,   color: "green" },
                                { icon: Mail,     label: "Alamat Email",   value: profile.email,  color: "emerald" },
                                { icon: Shield,   label: "Role Akun",      value: roleDisplayString, color: "teal" },
                                { icon: Calendar, label: "Bergabung Sejak", value: new Date(profile.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }), color: "green" },
                            ].map(item => (
                                <div key={item.label} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-sm hover:scale-[1.005] transition-all">
                                    <div className="p-2.5 bg-green-100 dark:bg-green-900/40 rounded-xl shrink-0">
                                        <item.icon className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{item.label}</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">{item.value}</p>
                                    </div>
                                    {item.label === "Role Akun" && <BadgeCheck className="w-5 h-5 text-green-500 shrink-0" />}
                                </div>
                            ))}
                        </div>

                        {/* Quick action cards */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button onClick={() => setActiveTab("name")} className="p-4 rounded-2xl bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 text-left hover:scale-[1.02] hover:shadow-md transition-all group">
                                <Pencil className="w-5 h-5 text-green-600 dark:text-green-400 mb-2" />
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Ubah Nama</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Ganti nama tampilan →</p>
                            </button>
                            <button onClick={() => setActiveTab("avatar")} className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-left hover:scale-[1.02] hover:shadow-md transition-all group">
                                <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Foto Profil</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Upload foto kamu →</p>
                            </button>
                        </div>
                    </div>
                )}

                {/* TAB: UBAH NAMA */}
                {activeTab === "name" && (
                    <div className="p-6 sm:p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-950/50 rounded-xl">
                                <Pencil className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Ubah Nama</h2>
                                <p className="text-xs text-slate-500">Nama yang terlihat di sidebar & dashboard</p>
                            </div>
                        </div>

                        {alert && <AlertBanner alert={alert} />}

                        <form onSubmit={handleNameUpdate} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nama Baru</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Masukkan nama kamu..."
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-green-500 dark:focus:border-green-400 text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none transition-all text-base font-semibold"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || name === profile?.name}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                Simpan Perubahan
                            </button>
                        </form>
                    </div>
                )}

                {/* TAB: KEAMANAN */}
                {activeTab === "security" && (
                    <div className="p-6 sm:p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-950/50 rounded-xl">
                                <Lock className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Keamanan</h2>
                                <p className="text-xs text-slate-500">Jaga akun kamu tetap aman 🔐</p>
                            </div>
                        </div>

                        {alert && <AlertBanner alert={alert} />}

                        <form onSubmit={handlePasswordUpdate} className="space-y-4">
                            {[
                                { label: "Password Saat Ini",      val: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(!showCurrent), placeholder: "Masukkan password lama..." },
                                { label: "Password Baru",          val: newPassword,     set: setNewPassword,     show: showNew,     toggle: () => setShowNew(!showNew),         placeholder: "Minimal 6 karakter..." },
                                { label: "Konfirmasi Password Baru", val: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(!showConfirm), placeholder: "Ulangi password baru..." },
                            ].map((field, idx) => (
                                <div key={idx} className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{field.label}</label>
                                    <div className="relative">
                                        <input
                                            type={field.show ? "text" : "password"}
                                            value={field.val}
                                            onChange={e => field.set(e.target.value)}
                                            placeholder={field.placeholder}
                                            className={`w-full px-5 py-4 pr-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none transition-all text-sm font-semibold ${
                                                idx === 2 && confirmPassword && newPassword !== confirmPassword
                                                    ? "border-red-400 dark:border-red-600"
                                                    : "border-transparent focus:border-green-500 dark:focus:border-green-400"
                                            }`}
                                        />
                                        <button type="button" onClick={field.toggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                                            {field.show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {idx === 1 && newPassword && (
                                        <div className="space-y-1.5 mt-2">
                                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-700 ${pwdStrength.color} ${pwdStrength.width}`} />
                                            </div>
                                            <p className="text-xs font-bold text-slate-400">{pwdStrength.label}</p>
                                        </div>
                                    )}
                                    {idx === 2 && confirmPassword && newPassword !== confirmPassword && (
                                        <p className="text-xs font-bold text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> Password tidak cocok
                                        </p>
                                    )}
                                </div>
                            ))}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 mt-2"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                                Ubah Password
                            </button>
                        </form>
                    </div>
                )}

                {/* TAB: FOTO PROFIL */}
                {activeTab === "avatar" && (
                    <div className="p-6 sm:p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-950/50 rounded-xl">
                                <Camera className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Foto Profil</h2>
                                <p className="text-xs text-slate-500">JPG, PNG, WEBP • Maks. 5MB</p>
                            </div>
                        </div>

                        {alert && <AlertBanner alert={alert} />}

                        {/* Avatar preview besar dengan glow hijau */}
                        <div className="flex justify-center py-4">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 blur-2xl opacity-30 scale-110 animate-pulse" />
                                <div className="relative ring-4 ring-green-200 dark:ring-green-900 rounded-full shadow-2xl">
                                    <AvatarDisplay image={avatarPreview || profile?.image} name={profile?.name || "?"} size="xl" />
                                </div>
                            </div>
                        </div>

                        {/* Drop zone */}
                        <div
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={e => {
                                e.preventDefault(); setIsDragging(false);
                                const file = e.dataTransfer.files[0];
                                if (file) handleFileSelect(file);
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative flex flex-col items-center justify-center p-10 rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-300 group ${
                                isDragging
                                    ? "border-green-500 bg-green-50 dark:bg-green-950/20 scale-[1.02]"
                                    : "border-slate-200 dark:border-slate-700 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-950/10 hover:scale-[1.01]"
                            }`}
                        >
                            <div className={`p-4 rounded-2xl mb-4 transition-all ${isDragging ? "bg-green-500 shadow-xl shadow-green-500/40" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-green-100 dark:group-hover:bg-green-900/30"}`}>
                                <Upload className={`w-7 h-7 transition-colors ${isDragging ? "text-white" : "text-slate-400 group-hover:text-green-600"}`} />
                            </div>
                            <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                                {isDragging ? "🌿 Lepaskan untuk Upload!" : "Klik atau Seret Foto ke Sini"}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Pilih area crop dengan rasio 1:1.</p>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                                onChange={e => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }} />
                        </div>

                        {avatarFile && (
                            <button
                                onClick={handleAvatarUpload}
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.01] disabled:opacity-50 text-base"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                Upload Foto Profil
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* CROP MODAL OVERLAY */}
            {cropModalOpen && imgForCrop && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">Sesuaikan Foto 1:1</h3>
                            <button onClick={() => setCropModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {/* Cropper Container */}
                        <div className="relative w-full h-[300px] bg-black/5">
                            <Cropper
                                image={imgForCrop}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                onCropChange={setCrop}
                                onCropComplete={handleCropComplete}
                                onZoomChange={setZoom}
                            />
                        </div>

                        {/* Slider & Action */}
                        <div className="p-5 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Perbesar (Zoom)</label>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full accent-green-600"
                                />
                            </div>
                            <button
                                onClick={confirmCrop}
                                disabled={isSubmitting}
                                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-green-500/20 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Potong & Lanjutkan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
