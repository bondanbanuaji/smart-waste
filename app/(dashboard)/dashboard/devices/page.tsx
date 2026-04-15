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
import { Plus, Wifi, WifiOff, Cpu, Trash2, Search, Radar, CheckCircle2, Pencil, AlertTriangle } from "lucide-react";
import { useSSE } from "@/hooks/useSSE";
import { useTTS } from "@/hooks/useTTS";
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
    const [isDeleting, setIsDeleting] = useState<string | null>(null); // ID device yang akan dihapus
    const [selectedDevice, setSelectedDevice] = useState<DeviceItem | null>(null);

    // Form state
    const [deviceCode, setDeviceCode] = useState("");
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Discovery Scan state
    const [nearbyDevices, setNearbyDevices] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isScanDocsOpen, setIsScanDocsOpen] = useState(false);
    
    // Force re-render state for accurate real-time online status
    const [currentTime, setCurrentTime] = useState(Date.now());

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

    const fetchNearby = async () => {
        try {
            const res = await fetch("/api/devices/nearby");
            const json = await res.json();
            if (json.data) setNearbyDevices(json.data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    // Sinkronisasi scan saat dialog dibuka
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isScanning) {
            fetchNearby();
            interval = setInterval(fetchNearby, 3000);
        }
        return () => clearInterval(interval);
    }, [isScanning]);

    // Force UI re-render setiap 10 detik agar status Terhubung/Terputus update seketika waktu berlalu
    const { speak } = useTTS();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
        return () => clearInterval(timer);
    }, []);

    useSSE((update: SSEDataUpdate) => {
        setDevices(prev => {
            // 🔊 Text-to-Speech: Umumkan jenis sampah (Fullstack Sync)
            if (update.type !== "ping" && update.wasteType) {
                const jenis = update.wasteType === "ORGANIC" ? "organik" : "anorganik";
                const rawName = update.deviceName || update.deviceCode;
                let spokenName = rawName.toLowerCase().replace(/[-_]/g, " ");
                if (spokenName.includes("arduino") || spokenName.includes("ard")) {
                    spokenName = spokenName.replace(/arduino|ard/g, "ardu ino");
                }
                speak(`Sampah ${jenis} terdeteksi pada ${spokenName}`);
            }

            const exists = prev.some(d => d.id === update.deviceId || d.deviceCode === update.deviceCode);
            
            // Jika device baru (Auto-Registered), refresh list dari server
            if (!exists) {
                fetchDevices();
                return prev;
            }

            return prev.map(d => {
                if (d.id === update.deviceId || d.deviceCode === update.deviceCode) {
                    const isPing = update.type === "ping";
                    return {
                        ...d,
                        name: update.deviceName || d.name, // Update nama secara realtime
                        lastPingAt: update.lastPingAt || new Date().toISOString(),
                        capacityPreview: isPing ? d.capacityPreview : { 
                            organic: update.organicLevel ?? d.capacityPreview?.organic ?? 0, 
                            inorganic: update.inorganicLevel ?? d.capacityPreview?.inorganic ?? 0 
                        }
                    };
                }
                return d;
            });
        });
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const isEditing = !!selectedDevice;
        const url = isEditing ? `/api/devices/${selectedDevice.id}` : "/api/devices";
        const method = isEditing ? "PATCH" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deviceCode, name, location }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Gagal menyimpan device");
            }

            if (isEditing) {
                setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, ...data.data } : d));
            } else {
                setDevices([data.data, ...devices]);
            }
            
            closeDialog();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/devices/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Gagal menghapus device");
            
            setDevices(prev => prev.filter(d => d.id !== id));
            setIsDeleting(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openCreateDialog = () => {
        setSelectedDevice(null);
        setDeviceCode("");
        setName("");
        setLocation("");
        setIsDialogOpen(true);
    };

    const openEditDialog = (device: DeviceItem) => {
        setSelectedDevice(device);
        setDeviceCode(device.deviceCode);
        setName(device.name);
        setLocation(device.location);
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setSelectedDevice(null);
        setDeviceCode("");
        setName("");
        setLocation("");
        setError(null);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Manajemen Device</h1>
                    <p className="text-slate-500 dark:text-slate-400">Kelola dan pantau seluruh unit smart waste bin (ESP32).</p>
                </div>
            </div>

                <div className="flex items-center gap-2">
                    <Dialog open={isScanning} onOpenChange={setIsScanning}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-semibold">
                                <Radar className="w-4 h-4 mr-2 text-green-500 animate-pulse" />
                                Scan Device Sekitar
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <div className="relative flex h-3 w-3 mr-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </div>
                                    Mendeteksi Unit...
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-slate-400">
                                    Mencari alat di jaringan lokal <strong>{(process.env.NEXT_PUBLIC_SERVER_LOCAL_IP || "192.168.1.1").split('.').slice(0, 3).join('.')}.x</strong> secara otomatis.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="py-6 space-y-4">
                                {nearbyDevices.length === 0 ? (
                                    <div className="py-12 text-center space-y-4 transition-all animate-in fade-in zoom-in duration-500">
                                        <div className="relative mx-auto w-24 h-24">
                                            <div className="absolute inset-0 rounded-full bg-green-500/10 dark:bg-green-500/20 animate-ping duration-1000" />
                                            <div className="absolute inset-4 rounded-full bg-green-500/20 dark:bg-green-500/30 animate-pulse" />
                                            <Search className="w-10 h-10 text-green-600 relative z-10 mx-auto top-7" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Menunggu Sinyal...</p>
                                            <p className="text-xs text-slate-500">Pastikan <code>serial_bridge.js</code> sedang berjalan.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-2">Unit Ditemukan</p>
                                        {nearbyDevices.map((device) => (
                                            <div key={device.deviceCode} className="group flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-white dark:hover:bg-slate-900 hover:border-green-200 dark:hover:border-green-900/50 transition-all duration-300">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform">
                                                        <Cpu className="w-5 h-5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{device.deviceCode}</h4>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-mono">{device.ip}</span>
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">● {device.type}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {device.isRegistered ? (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-green-600 bg-green-50 dark:bg-green-950/50 px-3 py-1.5 rounded-full font-bold border border-green-100 dark:border-green-900/50">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        AKTIF
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        size="sm" 
                                                        className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm h-8 px-4 font-bold text-xs"
                                                        onClick={() => {
                                                            setDeviceCode(device.deviceCode);
                                                            setName(device.deviceCode + " New");
                                                            setIsScanning(false);
                                                            setIsDialogOpen(true);
                                                        }}
                                                    >
                                                        Hubungkan
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
                        <DialogTrigger asChild>
                            <Button className="bg-green-600 hover:bg-green-700 text-white shadow-md" onClick={openCreateDialog}>
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Device
                            </Button>
                        </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{selectedDevice ? "Edit Detail Device" : "Registrasi Device Baru"}</DialogTitle>
                            <DialogDescription>
                                {selectedDevice ? "Perbarui informasi unit yang sudah terdaftar." : "Masukkan detail ESP32 baru untuk dihubungkan ke sistem."}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSave}>
                            <div className="grid gap-4 py-4">
                                {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

                                <div className="grid gap-2">
                                    <Label htmlFor="deviceCode">Kode Device</Label>
                                    <Input
                                        id="deviceCode"
                                        placeholder="Contoh: ESP32-05"
                                        value={deviceCode}
                                        onChange={(e) => setDeviceCode(e.target.value)}
                                        required
                                        disabled={!!selectedDevice} // Kunci jika sedang edit
                                        className={selectedDevice ? "bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed" : ""}
                                    />
                                    <p className="text-xs text-slate-500">
                                        {selectedDevice 
                                            ? "Kode hardware tidak dapat diubah saat edit. Hapus dan scan ulang jika ingin mengganti kode." 
                                            : "Kode unik ini harus sama dengan yang diprogram di ESP32."}
                                    </p>
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
                                <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
                                    Batal
                                </Button>
                                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                                    {isSubmitting ? "Menyimpan..." : (selectedDevice ? "Simpan Perubahan" : "Simpan Device")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog Konfirmasi Hapus */}
                <Dialog open={!!isDeleting} onOpenChange={(open) => !open && setIsDeleting(null)}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="w-5 h-5" />
                                Hapus Unit?
                            </DialogTitle>
                            <DialogDescription className="py-2">
                                Tindakan ini akan menghapus permanen alat <strong>{devices.find(d => d.id === isDeleting)?.name}</strong> beserta seluruh log riwayat sampahnya.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setIsDeleting(null)} disabled={isSubmitting}>Batal</Button>
                            <Button variant="destructive" onClick={() => isDeleting && handleDelete(isDeleting)} disabled={isSubmitting}>
                                {isSubmitting ? "Menghapus..." : "Ya, Hapus Permanen"}
                            </Button>
                        </DialogFooter>
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
                        const isOnline = !!device.lastPingAt && (currentTime - new Date(device.lastPingAt).getTime() < 60000);

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
                                        <div className="flex items-center gap-1.5">
                                            <button 
                                                onClick={() => openEditDialog(device)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                                                title="Edit Device"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => setIsDeleting(device.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                                title="Hapus Device"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                            <div className={`ml-1 p-1.5 rounded-full shadow-sm border ${isOnline ? 'bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-500 border-green-100 dark:border-green-900' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700'}`}>
                                                {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                                            </div>
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
