import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kelola Akun",
};

export default function AccountsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
