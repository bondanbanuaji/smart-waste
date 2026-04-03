import { Badge } from "@/components/ui/badge";
import { WadahType, WasteType } from "@/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    type: WasteType | WadahType;
    className?: string;
}

export function StatusBadge({ type, className }: StatusBadgeProps) {
    const isOrganic = type === "ORGANIC";

    return (
        <Badge
            variant="outline"
            className={cn(
                "font-medium tracking-wide transition-colors",
                isOrganic
                    ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-500 border-green-200 dark:border-green-800"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
                className
            )}
        >
            {isOrganic ? "Organik (Wet)" : "Anorganik (Dry)"}
        </Badge>
    );
}
