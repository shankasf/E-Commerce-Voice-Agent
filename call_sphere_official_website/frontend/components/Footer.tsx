import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin } from "lucide-react";
import type { Route } from "next";

import { currentYear } from "@/lib/utils";

const products: { label: string; href: Route }[] = [
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
];

const industries: { label: string; href: Route }[] = [
  { label: "Healthcare", href: "/industries#healthcare" as Route },
  { label: "Retail", href: "/industries#retail" as Route },
  { label: "Finance", href: "/industries#finance" as Route },
  { label: "Real Estate", href: "/industries#real-estate" as Route },
];

const company: { label: string; href: Route }[] = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Affiliate Program", href: "/affiliate" },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-gradient-to-b from-slate-50 to-slate-100 pt-16 pb-8">
      <div className="mx-auto max-w-6xl px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-5 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/callsphere-logo.png"
                alt="CallSphere logo"
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
                Poughkeepsie, NY
              </div>
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
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {currentYear()} CallSphere LLC. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href={"/privacy" as Route} className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href={"/terms" as Route} className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
