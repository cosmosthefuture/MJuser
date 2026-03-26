import type { Metadata } from "next";
import "./globals.css";
import { ReduxProvider } from "@/redux/provider";
import { Toaster } from "@/components/ui/sonner";
import LayoutWrapper from "@/components/LayoutWrapper";
// import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Game",
  description: "Play games online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ReduxProvider>
          <LayoutWrapper>
            {children}
            {/* <Footer /> */}
            <Toaster position="top-right" />
          </LayoutWrapper>
        </ReduxProvider>
      </body>
    </html>
  );
}
