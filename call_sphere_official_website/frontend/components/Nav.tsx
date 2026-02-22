"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type NavDropdownItem = {
  label: string;
  href: string;
  description?: string;
};

type NavItem = {
  label: string;
  href: string;
  children?: NavDropdownItem[];
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Products",
    href: "/features",
    children: [
      { label: "Features", href: "/features", description: "Platform capabilities" },
      { label: "Integrations", href: "/integrations/twilio", description: "Connect your tools" },
      { label: "Security", href: "/security", description: "Enterprise compliance" },
      { label: "Live Demo", href: "/demo", description: "Try it now" },
    ],
  },
  {
    label: "Solutions",
    href: "/industries",
    children: [
      { label: "HVAC Services", href: "/industries/hvac" },
      { label: "Healthcare", href: "/industries/healthcare" },
      { label: "IT Support", href: "/industries/it-support" },
      { label: "Logistics", href: "/industries/logistics" },
      { label: "All Industries", href: "/industries" },
    ],
  },
  { label: "Pricing", href: "/pricing" },
  {
    label: "Resources",
    href: "/blog",
    children: [
      { label: "Blog", href: "/blog", description: "Guides & insights" },
      { label: "Platform", href: "/platform", description: "Architecture overview" },
      { label: "Glossary", href: "/glossary", description: "Technical terms" },
      { label: "ROI Calculator", href: "/tools/roi-calculator", description: "Estimate savings" },
      { label: "FAQ", href: "/faq", description: "Common questions" },
      { label: "How It Works", href: "/how-it-works", description: "3-step setup" },
    ],
  },
  { label: "About", href: "/about" },
];

function DesktopDropdown({ items, isOpen }: { items: NavDropdownItem[]; isOpen: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
      <div className="w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href as Route}
            className="block rounded-lg px-3 py-2.5 transition hover:bg-slate-50"
          >
            <span className="block text-sm font-medium text-slate-900">
              {item.label}
            </span>
            {item.description && (
              <span className="block text-xs text-slate-500">
                {item.description}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenDropdown(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
      <div className="section-shell flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 transition hover:text-slate-700"
          aria-label="Go to CallSphere home"
        >
          <Image
            src="/callsphere-logo.webp"
            alt="CallSphere - AI voice and chat agents for business"
            width={36}
            height={36}
            className="h-9 w-9"
            priority
          />
          <span>CallSphere</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children && handleMouseEnter(item.label)}
              onMouseLeave={handleMouseLeave}
            >
              <Link
                href={item.href as Route}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900",
                  pathname === item.href && "text-slate-900"
                )}
              >
                {item.label}
                {item.children && (
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      openDropdown === item.label && "rotate-180"
                    )}
                  />
                )}
              </Link>
              {item.children && (
                <DesktopDropdown
                  items={item.children}
                  isOpen={openDropdown === item.label}
                />
              )}
            </div>
          ))}
        </nav>

        {/* CTA Button */}
        <div className="hidden lg:block">
          <Link
            href="/contact"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Book a Demo
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 lg:hidden"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="section-shell pb-4 lg:hidden">
          <nav className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            {NAV_ITEMS.map((item) => (
              <React.Fragment key={item.label}>
                <Link
                  href={item.href as Route}
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
                {item.children && (
                  <div className="ml-4 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href as Route}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 block w-full rounded-lg bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Book a Demo
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
