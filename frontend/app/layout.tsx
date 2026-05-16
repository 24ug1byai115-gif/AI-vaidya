import type { Metadata } from "next";
import { Cinzel_Decorative, Literata, Newsreader, Noto_Serif_Devanagari } from "next/font/google";
import Script from "next/script";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
});

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
});

const devanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "700"],
  variable: "--font-devanagari",
});

const cinzel = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-cinzel",
});

export const metadata: Metadata = {
  title: "AI Vaidya — Ancient Wisdom, Modern Intelligence",
  description: "A bridge between ancient Sanskrit manuscripts and neural intelligence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${newsreader.variable} ${literata.variable} ${devanagari.variable} ${cinzel.variable} min-h-screen bg-background text-on-background selection:bg-primary selection:text-on-primary antialiased`}
      >
        <div className="flex min-h-screen relative">
          <Sidebar />
          <div className="flex-1 min-w-0 relative">
            {children}
          </div>
        </div>
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" strategy="beforeInteractive" />
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" strategy="beforeInteractive" />
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
