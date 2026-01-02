import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";

import "@/styles/globals.css";

import { InteractiveWave } from "@/components/InteractiveWave";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://callsphere.tech"),
  title: "CallSphere - AI for Enterprise Customer Communications",
  description:
    "Deploy conversational AI that reduces contact center costs, cuts response times, and improves customer satisfaction across phone and chat.",
  keywords: [
    "AI voice agent",
    "AI chatbot",
    "enterprise AI",
    "customer communications",
    "contact center automation",
    "conversational AI",
    "CallSphere"
  ],
  applicationName: "CallSphere",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg"
  },
  openGraph: {
    title: "CallSphere - AI for Enterprise Customer Communications",
    description:
      "Deploy conversational AI that reduces contact center costs, cuts response times, and improves customer satisfaction across phone and chat.",
    url: "https://callsphere.tech",
    siteName: "CallSphere",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "CallSphere - AI for Enterprise Customer Communications"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "CallSphere - AI for Enterprise Customer Communications",
    description:
      "Deploy conversational AI that reduces contact center costs, cuts response times, and improves customer satisfaction.",
    images: ["/opengraph-image.png"]
  },
  alternates: {
    canonical: "/"
  },
  category: "technology"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen bg-background font-sans text-foreground`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <div className="relative min-h-screen overflow-hidden">
            <InteractiveWave />
            <div className="noise-overlay" aria-hidden />
            {children}
          </div>
        </ThemeProvider>
        <Script id="google-analytics-placeholder" strategy="afterInteractive">
          {`// Placeholder for Google Analytics or GTM\n// window.dataLayer = window.dataLayer || [];`}
        </Script>
      </body>
    </html>
  );
}
