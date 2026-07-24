import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spinnerei — Orga",
  description: "Organisation der Spinnerei",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
