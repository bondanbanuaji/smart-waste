import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToasterProvider } from "@/components/providers/ToasterProvider";
import { discovery } from "@/lib/discovery";

// Start discovery service on server-side
if (typeof window === "undefined") {
  discovery.start();
}

export const metadata: Metadata = {
  title: {
    default: "Smart Waste",
    template: "%s | Smart Waste",
  },
  description: "IoT Dashboard for Smart Waste Bin System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
      >
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ToasterProvider />
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
