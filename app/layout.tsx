import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import TopNav from "@/components/nav/TopNav";
import Footer from "@/components/nav/Footer";
import SmoothScroll from "@/components/motion/SmoothScroll";
import ScrollReset from "@/components/motion/ScrollReset";
import { SITE } from "@/lib/site-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: SITE.ogTitle,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.ogDescription,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.ogTitle,
    description: SITE.ogDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.ogTitle,
    description: SITE.ogDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Runs before paint to prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const stored = localStorage.getItem('theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (stored === 'dark' || (!stored && prefersDark)) {
              document.documentElement.classList.add('dark');
            }
          } catch(e) {}
        `}} />
      </head>
      <body className="flex min-h-full flex-col">
        <SmoothScroll>
          <ScrollReset />
          <TopNav />
          <div className="flex flex-1 flex-col pt-[57px]">{children}</div>
          <Footer />
        </SmoothScroll>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
