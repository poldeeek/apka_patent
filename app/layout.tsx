import type { Metadata, Viewport } from "next";
import "./globals.css";
import { publicUrl } from "@/lib/utils";
export const metadata: Metadata = {
  title: "Apka pod patent · Paweł rządzi",
  description:
    "Ucz się w swoim tempie. Losowane testy i wygodna nauka na telefonie.",
  manifest: publicUrl("/manifest.webmanifest"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pod patent",
  },
  icons: {
    icon: publicUrl("/icons/icon-192.png"),
    apple: publicUrl("/icons/apple-touch-icon.png"),
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#112b36",
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
