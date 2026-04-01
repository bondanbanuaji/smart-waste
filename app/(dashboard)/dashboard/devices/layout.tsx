import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Manajemen Device",
};

export default function DevicesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
