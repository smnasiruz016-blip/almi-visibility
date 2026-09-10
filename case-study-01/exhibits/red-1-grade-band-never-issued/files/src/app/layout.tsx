import type { Metadata } from "next";
import { Inter, Allura } from "next/font/google";
import "./globals.css";
import { GlobalFooter } from "@/components/GlobalFooter";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const allura = Allura({ variable: "--font-allura", subsets: ["latin"], weight: "400", display: "swap" });

const SITE_URL = "https://almioet.almiworld.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AlmiOET — Occupational English Test practice for healthcare with honest AI feedback",
    template: "%s · AlmiOET",
  },
  description:
    "Practise the Occupational English Test for healthcare on the real 0–500 scale, with an A–E grade per sub-test, honest AI feedback, and all 12 professions. Original material, never copied from OET. Part of the AlmiWorld family.",
  applicationName: "AlmiOET",
  authors: [{ name: "AlmiWorld" }],
  keywords: ["Occupational English Test", "OET", "OET practice", "OET preparation", "OET for nurses", "OET writing", "OET speaking", "healthcare English test", "AlmiOET", "AlmiWorld"],
  openGraph: {
    title: "AlmiOET — honest Occupational English Test practice for healthcare",
    description: "Original practice on the real 0–500 scale, with an A–E grade per sub-test, honest AI feedback, and all 12 professions.",
    url: SITE_URL,
    siteName: "AlmiOET",
    type: "website",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: "AlmiOET — Occupational English Test practice", description: "Honest OET practice on the 0–500 scale — a grade per sub-test, ranges not inflated numbers." },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${allura.variable} h-full antialiased`}>
      {/* 🔴 NO HEADER HERE, DELIBERATELY. The header has to know whether someone
          is signed in, and reading the session in the ROOT layout makes every
          route under it dynamic — including `/`, which is `○ (Static)` with an
          explicit `export const revalidate = 3600`. So the header is rendered
          one level down by each segment, which is where the session read either
          already happens or is free. The owners are enumerated and asserted in
          tests/header-session.test.tsx, so this is not a rule anyone has to
          remember. */}
      <body className="min-h-full flex flex-col">
        <div className="flex flex-1 flex-col">{children}</div>
        <GlobalFooter />
      </body>
    </html>
  );
}
