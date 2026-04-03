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
import { Plus, Wifi, WifiOff, Cpu, Trash2 } from "lucide-react";
import { useSSE } from "@/hooks/useSSE";
import { SSEDataUpdate } from "@/types";

interface DeviceItem {
    id: string;
    deviceCode: string;
    name: string;
    location: string;
    lastPingAt?: string | null;
    capacityPreview?: { organic: number, inorganic: number };
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

    useSSE((update: SSEDataUpdate) => {
        setDevices(prev => prev.map(d => {
            if (d.id === update.deviceId) {
                return {
                    ...d,
                    lastPingAt: new Date().toISOString(),
                    capacityPreview: { organic: update.organicLevel, inorganic: update.inorganicLevel }
                };
            }
            return d;
        }));
    });

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
                            <div key={device.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow group relative">
                                {isOnline && <div className="absolute top-0 right-0 w-24 h-24 bg-green-400/5 dark:bg-green-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />}

                                <div className="p-5 border-b border-slate-50 dark:border-slate-800 relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                                                <Cpu className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            </div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-tight">{device.deviceCode}</h3>
                                        </div>
                                        <div className={`p-1.5 rounded-full shadow-sm border ${isOnline ? 'bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-500 border-green-100 dark:border-green-900' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700'}`}>
                                            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                                        </div>
                                    </div>
                                    <h4 className="font-semibold text-slate-700 dark:text-slate-200 line-clamp-1">{device.name}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 flex items-center gap-1">
                                        {device.location}
                                    </p>
                                </div>

                                {device.capacityPreview && (
                                    <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-50 dark:border-slate-800 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${device.capacityPreview.organic}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-slate-400 rounded-full transition-all duration-500" style={{ width: `${device.capacityPreview.inorganic}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Status Koneksi</span>
                                    {isOnline ? (
                                        <span className="text-green-600 dark:text-green-500 font-bold flex items-center gap-1.5">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                            Terhubung
                                        </span>
                                    ) : (
                                        <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                                            Terputus
                                        </span>
                                    )}
                                </div>

                                <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800 flex flex-col gap-0.5">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Terakhir Aktif</span>
                                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
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
