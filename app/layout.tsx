import type { Metadata } from "next";
import { Inconsolata, Silkscreen } from "next/font/google";
import "./globals.css";

const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-silkscreen",
});

const inconsolata = Inconsolata({
  subsets: ["latin"],
  variable: "--font-inconsolata",
});

export const metadata: Metadata = {
  title: "NoPunks BLocks",
  description: "A experimental pixel app building with the NoPunks API.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${silkscreen.variable} ${inconsolata.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}