import type { Metadata, Viewport } from "next";
import { SessionProvider } from "@/components/session/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Blueberry — Social Image Resizer",
    template: "%s · Blueberry",
  },
  description: "Resize and crop any image to the exact dimensions Instagram, TikTok and YouTube expect.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-berry-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
