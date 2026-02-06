import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { TRPCProvider } from "@/components/TRPCProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlantedTankLab",
  description: "PCPartPicker for planted aquariums",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCProvider>
          <div className="min-h-dvh bg-white text-neutral-900">
            <header className="border-b border-neutral-200">
              <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
                <Link href="/" className="font-semibold tracking-tight">
                  PlantedTankLab
                </Link>
                <nav className="flex items-center gap-4 text-sm text-neutral-700">
                  <Link href="/builder" className="hover:text-neutral-900">
                    Builder
                  </Link>
                  <Link href="/products" className="hover:text-neutral-900">
                    Products
                  </Link>
                  <Link href="/plants" className="hover:text-neutral-900">
                    Plants
                  </Link>
                </nav>
              </div>
            </header>
            {children}
          </div>
        </TRPCProvider>
      </body>
    </html>
  );
}
