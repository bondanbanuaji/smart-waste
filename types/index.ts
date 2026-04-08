export type WasteType = "ORGANIC" | "INORGANIC";
export type WadahType = "ORGANIC" | "INORGANIC";
export type Role = "ADMIN" | "OFFICER";

export interface DeviceWithCapacity {
    id: string;
    deviceCode: string;
    name: string;
    location: string;
    isActive: boolean;
    lastPingAt: string | null;
    latestCapacity: {
        organicLevel: number;
        inorganicLevel: number;
        recordedAt: string;
    } | null;
}

export interface DashboardData {
    devices: DeviceWithCapacity[];
    stats: {
        totalEventToday: number;
        totalOrganicToday: number;
        totalInorganicToday: number;
        totalEventThisWeek: number;
        weeklyChartData: { label: string; organic: number; inorganic: number }[];
    };
    unreadNotificationCount: number;
}

export interface WasteEventItem {
    id: string;
    deviceCode: string;
    deviceName: string;
    wasteType: WasteType;
    moistureValue: number;
    detectedAt: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface NotificationItem {
    id: string;
    deviceName: string;
    wadahType: WadahType;
    capacityValue: number;
    isRead: boolean;
    createdAt: string;
}

export interface CapacityDataPoint {
    time: string;
    organicLevel: number;
    inorganicLevel: number;
}

export interface SSEDataUpdate {
    deviceId: string;
    deviceCode: string;
    deviceName?: string;      // Tambahkan nama alat
    type?: "event" | "ping";
    organicLevel?: number;
    inorganicLevel?: number;
    wasteType?: WasteType;
    moistureValue?: number;  // Tambahkan nilai kelembapan
    hasAlert?: boolean;
    alertWadah?: WadahType;
}

export interface IoTPayload {
    deviceCode: string;
    type?: "event" | "ping"; // Tambahkan tipe payload
    wasteType: WasteType;
    moistureValue: number;
    organicLevel: number;
    inorganicLevel: number;
}
