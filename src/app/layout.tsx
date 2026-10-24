import type { Metadata, Viewport } from "next";
import { Cairo, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/mdfamily/ServiceWorkerRegister";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MD.Family | سلامة رقمية للعائلة",
  description:
    "MD.Family — تطبيق الرقابة الأبوية والسلامة الرقمية. إدارة وقت الشاشة، تصفية الويب، الموقع الآمن، وتنبيهات السلامة لأسرتك.",
  keywords: [
    "MD.Family",
    "MD-Sabry",
    "الرقابة الأبوية",
    "سلامة الأطفال",
    "وقت الشاشة",
    "تصفية الويب",
    "Parental Control",
  ],
  authors: [{ name: "MD.Family Team" }],
  applicationName: "MD.Family",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MD.Family",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#005C9E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
        <Toaster />
        <Sonner position="top-center" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
