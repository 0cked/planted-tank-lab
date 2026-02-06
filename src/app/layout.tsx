import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Spline_Sans } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/components/TRPCProvider";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

const fontSans = Spline_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const fontDisplay = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://plantedtanklab.com"),
  title: {
    default: "PlantedTankLab",
    template: "%s",
  },
  description: "PCPartPicker for planted aquariums.",
  openGraph: {
    title: "PlantedTankLab",
    description: "PCPartPicker for planted aquariums.",
    url: "https://plantedtanklab.com",
    siteName: "PlantedTankLab",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlantedTankLab",
    description: "PCPartPicker for planted aquariums.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fontSans.variable} ${geistMono.variable} ${fontDisplay.variable} antialiased`}
      >
        <TRPCProvider>
          <div className="ptl-app text-neutral-900">
            <SiteHeader />
            {children}
            <SiteFooter />
          </div>
        </TRPCProvider>
      </body>
    </html>
  );
}
