import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Link from "next/link";
import ThemeSwitcher from "@/components/ThemeSwitcher";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "LogTable",
    description: "Track your work time locally",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
            <Providers>
                <body className="flex flex-col h-screen overflow-hidden m-0">
                    <header className="h-10 shrink-0 flex justify-between items-center px-4 border-b border-divider text-sm font-medium">
                        <div className="flex gap-4">
                            <Link href="/" className="hover:underline">Home</Link>
                            <Link href="/table" className="hover:underline">Table</Link>
                        </div>
                        <ThemeSwitcher />
                    </header>
                    <main className="flex-1 overflow-auto flex flex-col">
                        {children}
                    </main>
                </body>
            </Providers>
        </html>
    );
}
