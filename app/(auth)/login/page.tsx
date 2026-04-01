"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Leaf, Loader2 } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("admin@smarttrash.com");
    const [password, setPassword] = useState("admin123");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (res?.error) {
                setError(res.error);
                setLoading(false);
            } else {
                const from = searchParams.get("from");
                router.push(from || "/dashboard");
                router.refresh();
            }
        } catch {
            setError("Terjadi kesalahan sistem.");
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md shadow-2xl border-none ring-1 ring-black/5 bg-white/80 backdrop-blur-xl">
            <CardHeader className="space-y-3 pb-6 text-center">
                <div className="mx-auto bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner mb-2 ring-1 ring-green-500/20">
                    <Leaf className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">Smart-Trash</CardTitle>
                <CardDescription className="text-slate-500 text-base">
                    Sistem Manajemen Sampah IoT Pintar
                </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2 font-medium border border-red-100">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@smarttrash.com"
                            required
                            className="h-11 transition-all focus-visible:ring-green-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="h-11 transition-all focus-visible:ring-green-500"
                        />
                    </div>
                </CardContent>
                <CardFooter className="pt-2 pb-8">
                    <Button
                        type="submit"
                        className="w-full h-11 text-base font-semibold bg-green-600 hover:bg-green-700 shadow-md shadow-green-600/20 transition-all hover:shadow-lg hover:-translate-y-0.5"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Masuk...
                            </>
                        ) : (
                            "Masuk ke Dashboard"
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
