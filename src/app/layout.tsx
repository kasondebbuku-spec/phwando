import type { Metadata } from "next";
import { Bodoni_Moda, Cormorant_Garamond, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bodoni_Moda({ subsets: ["latin"], variable: "--font-display", style: ["normal", "italic"] });
const serif = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-serif", weight: ["400", "500"], style: ["normal", "italic"] });
const ui = Instrument_Sans({ subsets: ["latin"], variable: "--font-ui" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "Phwando", template: "%s · Phwando" },
  description: "Event invitations, mobile-money tickets and door check-in for venues and organisers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className={`${display.variable} ${serif.variable} ${ui.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
