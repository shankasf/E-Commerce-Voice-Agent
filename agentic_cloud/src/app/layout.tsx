import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Agentic Cloud - Cloud Infrastructure with Natural Language | CallSphere",
    template: "%s | Agentic Cloud by CallSphere",
  },
  description:
    "Provision cloud resources using natural language. Build faster with AI-powered infrastructure that understands your needs. An intelligent alternative to traditional cloud providers.",
  keywords: [
    "cloud platform",
    "agentic cloud",
    "AI cloud",
    "natural language provisioning",
    "cloud infrastructure",
    "serverless",
    "containers",
    "databases",
    "callsphere",
  ],
  authors: [{ name: "CallSphere" }],
  creator: "CallSphere",
  publisher: "CallSphere",
  metadataBase: new URL("https://cloud.callsphere.tech"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://cloud.callsphere.tech",
    siteName: "Agentic Cloud by CallSphere",
    title: "Agentic Cloud - Cloud Infrastructure with Natural Language",
    description:
      "Provision cloud resources using natural language. Build faster with AI-powered infrastructure.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Agentic Cloud by CallSphere",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentic Cloud - Cloud Infrastructure with Natural Language",
    description:
      "Provision cloud resources using natural language. Build faster with AI-powered infrastructure.",
    creator: "@callsphere",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <AnimatedBackground />
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
