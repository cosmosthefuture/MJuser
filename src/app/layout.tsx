import type { Metadata } from "next";
import "./globals.css";
import { ReduxProvider } from "@/redux/provider";
import { Toaster } from "@/components/ui/sonner";
import LayoutWrapper from "@/components/LayoutWrapper";
import PwaRegister from "./PwaRegister";
// import Footer from "@/components/Footer";

export const viewport = {
  themeColor: "#0b0b0f",
};

export const metadata: Metadata = {
  title: "Play & Go",
  description: "Play games online",
  manifest: "/manifest.webmanifest",
  other: {
    google: "notranslate",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Play & Go",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning translate="no">
      <body className="antialiased" suppressHydrationWarning>
        <ReduxProvider>
          <LayoutWrapper>
            <PwaRegister />
            {children}
            {/* <Footer /> */}
            <Toaster position="top-right" />
          </LayoutWrapper>
        </ReduxProvider>
      </body>
    </html>
  );
}
