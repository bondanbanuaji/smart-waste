import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlertBannerProps {
    alerts: {
        deviceName: string;
        wadahType: string;
        capacityValue: number;
        notificationId: string;
    }[];
    onDismiss: (notificationId: string) => void;
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
    if (!alerts || alerts.length === 0) return null;

    return (
        <div className="space-y-3 mb-6">
            {alerts.map((alert) => (
                <div
                    key={alert.notificationId}
                    className="bg-red-500/10 border border-red-500/20 text-red-900 dark:text-red-100 px-6 py-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-red-500 text-white p-2 rounded-lg shrink-0 animate-pulse">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-red-800 dark:text-red-200 text-lg tracking-tight">Segera Angkut!</p>
                            <p className="text-red-700 dark:text-red-300 font-medium">
                                {alert.deviceName} — Wadah <span className="font-bold">{alert.wadahType === "ORGANIC" ? "Organik (Wet)" : "Anorganik (Dry)"}</span> telah penuh ({alert.capacityValue}%).
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => onDismiss(alert.notificationId)}
                        className="shrink-0 bg-red-600 hover:bg-red-700 text-white border-transparent shadow-md hover:shadow-lg transition-all"
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Tandai Sudah Diangkut
                    </Button>
                </div>
            ))}
        </div>
    );
}
