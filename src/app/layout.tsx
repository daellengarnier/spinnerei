import type { Metadata, Viewport } from "next";
import { Barlow, Share_Tech_Mono, VT323 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Schriften wie in der Spinnplan-App: Barlow (Grundschrift),
// Share Tech Mono (Labels/Buttons), VT323 (Titel).
const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-barlow" });
const techMono = Share_Tech_Mono({ subsets: ["latin"], weight: "400", variable: "--font-tech-mono" });
const vt323 = VT323({ subsets: ["latin"], weight: "400", variable: "--font-vt323" });

export const metadata: Metadata = {
  title: "Spinnerei – Orga",
  description: "Organisations-App der Spinnerei — alle Anlässe an einem Ort",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Spinnerei",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${barlow.variable} ${techMono.variable} ${vt323.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
