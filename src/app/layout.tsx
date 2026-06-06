import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import PWAInstallPrompt from "@/components/ui/PWAInstallPrompt";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TalkBase",
  description: "녹음된 대화를 업무 지식으로 바꾸다",
  manifest: "/manifest.json",
  icons: {
    icon: '/logo/icon-filled.svg',
    apple: '/logo/icon-filled.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TalkBase',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#1A60FD',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className={`${geist.className} min-h-full bg-gray-50 pb-16 md:pb-0`}>
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
