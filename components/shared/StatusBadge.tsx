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
                "font-medium tracking-wide",
                isOrganic
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-slate-100 text-slate-600 border-slate-200",
                className
            )}
        >
            {isOrganic ? "Organik" : "Anorganik"}
        </Badge>
    );
}
