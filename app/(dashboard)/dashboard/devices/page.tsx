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
import { Plus, Wifi, WifiOff, Cpu } from "lucide-react";

interface DeviceItem {
    id: string;
    deviceCode: string;
    name: string;
    location: string;
    lastPingAt?: string | null;
}

export default function DevicesPage() {
    const [devices, setDevices] = useState<DeviceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form state
    const [deviceCode, setDeviceCode] = useState("");
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDevices = async () => {
        try {
            const res = await fetch("/api/devices");
            const json = await res.json();
            if (json.data) setDevices(json.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/devices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deviceCode, name, location }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Gagal menambahkan device");
            }

            setDevices([data.data, ...devices]);
            setIsDialogOpen(false);
            setDeviceCode("");
            setName("");
            setLocation("");
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Manajemen Device</h1>
                    <p className="text-slate-500 dark:text-slate-400">Kelola dan pantau seluruh unit smart waste bin (ESP32).</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700 text-white shadow-md">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Device
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Registrasi Device Baru</DialogTitle>
                            <DialogDescription>
                                Masukkan detail ESP32 baru untuk dihubungkan ke sistem.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate}>
                            <div className="grid gap-4 py-4">
                                {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>}

                                <div className="grid gap-2">
                                    <Label htmlFor="deviceCode">Kode Device</Label>
                                    <Input
                                        id="deviceCode"
                                        placeholder="Contoh: ESP32-05"
                                        value={deviceCode}
                                        onChange={(e) => setDeviceCode(e.target.value)}
                                        required
                                    />
                                    <p className="text-xs text-slate-500">Kode unik ini harus sama dengan yang diprogram di ESP32.</p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nama Display</Label>
                                    <Input
                                        id="name"
                                        placeholder="Contoh: Tempat Sampah Kantin"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="location">Lokasi Fisik</Label>
                                    <Input
                                        id="location"
                                        placeholder="Contoh: Lantai 1 dekat pintu masuk"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                                    Batal
                                </Button>
                                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                                    {isSubmitting ? "Menyimpan..." : "Simpan Device"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full"><LoadingSkeleton /></div>
                ) : devices.length === 0 ? (
                    <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm text-slate-500 dark:text-slate-400 flex flex-col items-center">
                        <Cpu className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-3" />
                        <p>Belum ada device yang terdaftar.</p>
                    </div>
                ) : (
                    devices.map((device) => {
                        const isOnline = !!device.lastPingAt && (new Date().getTime() - new Date(device.lastPingAt).getTime() < 5 * 60000);

                        return (
                            <div key={device.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-5 border-b border-slate-50 dark:border-slate-800">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <Cpu className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100">{device.deviceCode}</h3>
                                        </div>
                                        <div className={`p-1.5 rounded-full ${isOnline ? 'bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                                            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                                        </div>
                                    </div>
                                    <h4 className="font-semibold text-slate-700 dark:text-slate-200 line-clamp-1">{device.name}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 flex items-center gap-1">
                                        {device.location}
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Status</span>
                                    {isOnline ? (
                                        <span className="text-green-600 dark:text-green-500 font-semibold px-2 py-0.5 bg-green-100 dark:bg-green-950/80 rounded text-[10px] tracking-wide uppercase">Online</span>
                                    ) : (
                                        <span className="text-slate-500 dark:text-slate-400 font-semibold px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-[10px] tracking-wide uppercase">Offline</span>
                                    )}
                                </div>

                                <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800 flex flex-col gap-0.5">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Terakhir Aktif</span>
                                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                        {device.lastPingAt ? formatRelativeTime(device.lastPingAt) : "Belum pernah aktif"}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
