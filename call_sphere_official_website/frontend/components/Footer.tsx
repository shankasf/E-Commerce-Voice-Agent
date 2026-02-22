import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { Mail, MapPin, Linkedin, Twitter, Facebook, Instagram } from "lucide-react";

import { currentYear } from "@/lib/utils";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z" />
    </svg>
  );
}

const socials = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/call-sphere", icon: Linkedin },
  { label: "X (Twitter)", href: "https://x.com/callsphere", icon: Twitter },
  { label: "Facebook", href: "https://www.facebook.com/callspherellc", icon: Facebook },
  { label: "Instagram", href: "https://www.instagram.com/callsphereny/", icon: Instagram },
  { label: "TikTok", href: "https://www.tiktok.com/@callsphere", icon: TikTokIcon },
];

const products: { label: string; href: Route }[] = [
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Live Demo", href: "/demo" as Route },
];

const industries: { label: string; href: Route }[] = [
  { label: "HVAC Services", href: "/industries/hvac" as Route },
  { label: "Healthcare", href: "/industries/healthcare" as Route },
  { label: "IT Support", href: "/industries/it-support" as Route },
  { label: "Logistics", href: "/industries/logistics" as Route },
];

const resources: { label: string; href: Route }[] = [
  { label: "Blog", href: "/blog" as Route },
  { label: "Platform", href: "/platform" as Route },
  { label: "Glossary", href: "/glossary" as Route },
  { label: "FAQ", href: "/faq" },
  { label: "ROI Calculator", href: "/tools/roi-calculator" as Route },
];

const company: { label: string; href: Route }[] = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Affiliate Program", href: "/affiliate" },
];

const legal: { label: string; href: Route }[] = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Security", href: "/security" },
  { label: "Subprocessors", href: "/subprocessors" },
  { label: "Data Rights", href: "/data-rights" },
];


export function Footer() {
  return (
    <footer className="mt-16 bg-gradient-to-b from-slate-50 to-slate-100 pt-16 pb-8">
      <div className="mx-auto max-w-6xl px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-7 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/callsphere-logo.webp"
                alt="CallSphere - AI voice and chat agents for business"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <span className="text-xl font-bold text-slate-900">CallSphere</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-xs">
              AI-powered voice agents for enterprise customer communications.
              Transform your customer experience with intelligent automation.
            </p>
            {/* Contact Info */}
            <div className="flex flex-col gap-3">
              <a href="mailto:sagar@callsphere.tech" className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors">
                <Mail className="h-4 w-4" />
                sagar@callsphere.tech
              </a>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4" />
                27 Orchard Pl, New York, NY
              </div>
            </div>
            {/* Social Media */}
            <div className="mt-6 flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Follow CallSphere on ${s.label}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition-all hover:bg-blue-600 hover:text-white hover:scale-110"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Products Column */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 mb-4">Products</h3>
            <ul className="flex flex-col gap-3">
              {products.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-600 hover:text-blue-600 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Industries Column */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 mb-4">Industries</h3>
            <ul className="flex flex-col gap-3">
              {industries.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-600 hover:text-blue-600 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 mb-4">Resources</h3>
            <ul className="flex flex-col gap-3">
              {resources.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-600 hover:text-blue-600 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 mb-4">Company</h3>
            <ul className="flex flex-col gap-3">
              {company.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-600 hover:text-blue-600 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 mb-4">Legal</h3>
            <ul className="flex flex-col gap-3">
              {legal.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-600 hover:text-blue-600 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <CookieSettingsButton />
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {currentYear()} CallSphere LLC. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                <Link href={"/privacy" as Route} className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                  Privacy
                </Link>
                <Link href={"/terms" as Route} className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                  Terms
                </Link>
                <Link href={"/security" as Route} className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                  Security
                </Link>
                <Link href={"/data-rights" as Route} className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                  Data Rights
                </Link>
              </div>
              <div className="hidden sm:flex items-center gap-2 border-l border-slate-300 pl-5">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="text-slate-400 transition-colors hover:text-blue-600"
                  >
                    <s.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
