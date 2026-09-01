import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "./pwa-register";
import "katex/dist/katex.min.css";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#10110f" },
    { media: "(prefers-color-scheme: light)", color: "#f4f3ef" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const base = new URL(`${protocol}://${host}`);
  return {
    metadataBase: base,
    title: "ATLAS · 个人工作台",
    description: "跨 Windows 与手机端的个人任务、知识沉淀和每周复盘工作台。",
    manifest: "/manifest.webmanifest",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/icon-192.png" },
    applicationName: "ATLAS 个人工作台",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ATLAS" },
    openGraph: { title: "ATLAS · 个人工作台", description: "让每一次专注，都成为可复用的成长。", type: "website", images: [{ url: "/og.png", width: 1672, height: 941, alt: "ATLAS 个人工作台跨端界面" }] },
    twitter: { card: "summary_large_image", title: "ATLAS · 个人工作台", description: "让每一次专注，都成为可复用的成长。", images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" suppressHydrationWarning><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}<PwaRegister /></body></html>;
}
