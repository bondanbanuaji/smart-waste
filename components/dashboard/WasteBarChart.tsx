"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WasteBarChartProps {
    data: { label: string; organic: number; inorganic: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card border border-border p-3 rounded-xl shadow-xl text-xs backdrop-blur-sm bg-card/90">
                <p className="font-bold text-foreground mb-2 border-b border-border pb-1">{label}</p>
                {payload.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-muted-foreground">{item.name}:</span>
                        </div>
                        <span className="font-bold text-foreground">{item.value} unit</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export function WasteBarChart({ data }: WasteBarChartProps) {
    return (
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-none bg-card text-card-foreground">
            <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">Distribusi Sampah Terkumpul</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {data.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                            Belum ada data
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                                <XAxis
                                    dataKey="label"
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
                                />
                                <Tooltip
                                    cursor={{ fill: 'currentColor', className: 'text-slate-100/50 dark:text-slate-800/50' }}
                                    content={<CustomTooltip />}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                                <Bar name="Organik (Wet)" dataKey="organic" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={32} />
                                <Bar name="Anorganik (Dry)" dataKey="inorganic" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
