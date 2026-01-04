"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Products", href: "/features" as const },
  { label: "Industries", href: "/industries" as const },
  { label: "Pricing", href: "/pricing" as const },
  { label: "About", href: "/about" as const },
];

export function Nav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
      <div className="section-shell flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 transition hover:text-slate-700"
          aria-label="Go to CallSphere home"
        >
          <Image
            src="/callsphere-logo.png"
            alt="CallSphere logo"
            width={36}
            height={36}
            className="h-9 w-9"
            priority
          />
          <span>CallSphere</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-semibold text-slate-700 transition hover:text-slate-900",
                pathname === item.href && "text-slate-900"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTA Button */}
        <div className="hidden md:block">
          <Link
            href="/contact"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Contact Sales
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 md:hidden"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="section-shell pb-4 md:hidden">
          <nav className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block w-full rounded-lg px-4 py-3 text-sm font-semibold transition hover:bg-slate-50",
                  pathname === item.href
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-700"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 block w-full rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Contact Sales
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
