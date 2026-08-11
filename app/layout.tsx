import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';

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
            suppressHydrationWarning
        >
            <Providers>
                <body className="flex flex-col h-screen overflow-hidden m-0">
                    <InitColorSchemeScript attribute="data" />
                    <Header />
                    <main className="flex-1 overflow-auto flex flex-col">
                        {children}
                    </main>
                </body>
            </Providers>
        </html>
    );
}
