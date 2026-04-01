"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WasteLineChartProps {
    data: { time: string; organicLevel: number; inorganicLevel: number }[];
    deviceName: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card border border-border p-3 rounded-xl shadow-xl text-xs backdrop-blur-sm bg-card/90">
                <p className="font-bold text-foreground mb-2 border-b border-border pb-1">{label}</p>
                {payload.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}:</span>
                        <span className="font-bold text-foreground">{item.value}%</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export function WasteLineChart({ data, deviceName }: WasteLineChartProps) {
    return (
        <Card className="col-span-1 border-none shadow-sm bg-card text-card-foreground">
            <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">Tren Kapasitas: {deviceName}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {data.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                            Belum ada data
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                                <XAxis
                                    dataKey="time"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12 }}
                                    className="fill-slate-400 dark:fill-slate-600"
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12 }}
                                    className="fill-slate-400 dark:fill-slate-600"
                                    domain={[0, 100]}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line name="Organik" type="monotone" dataKey="organicLevel" stroke="#22c55e" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Line name="Anorganik" type="monotone" dataKey="inorganicLevel" stroke="#94a3b8" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
