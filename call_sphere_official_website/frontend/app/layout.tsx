import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";

import { InteractiveWave } from "@/components/InteractiveWave";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { MultiAgentVoiceLauncher } from "@/components/MultiAgentVoiceLauncher";
import { CookieConsent } from "@/components/CookieConsent";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { OrganizationJsonLd, LocalBusinessJsonLd, WebSiteJsonLd } from "@/components/StructuredData";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://callsphere.tech"),
  title: "AI Voice Agents & Chatbots for Business | CallSphere",
  description:
    "Deploy AI voice and chat agents that automate customer calls, schedule appointments, and process payments 24/7. Try our live demo. Plans from $149/mo.",
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
    icon: "/callsphere-logo.png",
    shortcut: "/callsphere-logo.png",
    apple: "/callsphere-logo.png"
  },
  openGraph: {
    title: "AI Voice Agents & Chatbots for Business | CallSphere",
    description:
      "Deploy AI voice and chat agents that automate customer calls, schedule appointments, and process payments 24/7. Try our live demo. Plans from $149/mo.",
    url: "https://callsphere.tech",
    siteName: "CallSphere",
    images: [
      {
        url: "/opengraph-image",
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
      "Deploy AI voice and chat agents that automate customer calls, schedule appointments, and process payments 24/7. Plans from $149/mo.",
    images: ["/opengraph-image"]
  },
  alternates: {
    canonical: "https://callsphere.tech"
  },
  manifest: "/manifest.json",
  category: "technology",
  verification: {
    google: "9TZp1JawcL4HGhV4PRgCxDvaPv1PwInN0ORqcWIs3So"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-readable site summary" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="LLM-readable full content" />
      </head>
      <body className={`${inter.variable} min-h-screen bg-background font-sans text-foreground`} suppressHydrationWarning>
        <OrganizationJsonLd />
        <LocalBusinessJsonLd />
        <WebSiteJsonLd />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <div className="relative min-h-screen overflow-hidden">
            <InteractiveWave />
            <div className="noise-overlay" aria-hidden="true" />
            {children}
          </div>
          <MultiAgentVoiceLauncher />
          <CookieConsent />
        </ThemeProvider>
        <AnalyticsScripts />
      </body>
    </html>
  );
}
