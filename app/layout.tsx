import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { HaircutSlideshow } from "@/components/layout/haircut-slideshow";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "600", "700", "800", "900"],
});

const archivoDisplay = Archivo({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "World Cup Instrument",
  description: "Predict scores, props, and climb the leaderboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        archivo.variable,
        archivoDisplay.variable,
        jetbrainsMono.variable,
        "font-sans"
      )}
    >
      <body className="antialiased">
        <HaircutSlideshow />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
