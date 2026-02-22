import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ShoppingCart,
  CreditCard,
  Headphones,
  Moon,
} from "lucide-react";

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { BreadcrumbJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "AI Voice Agent Solutions | CallSphere",
  description:
    "Automate appointment scheduling, order processing, payment collection, customer support, and after-hours answering with CallSphere AI voice agents.",
  alternates: {
    canonical: "https://callsphere.tech/solutions",
  },
  openGraph: {
    title: "AI Voice Agent Solutions | CallSphere",
    description:
      "Automate appointment scheduling, order processing, payment collection, customer support, and after-hours answering with AI voice agents.",
    url: "https://callsphere.tech/solutions",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Voice Agent Solutions | CallSphere",
    description:
      "Automate appointment scheduling, order processing, payment collection, customer support, and after-hours answering.",
  },
};

const solutions = [
  {
    slug: "appointment-scheduling",
    name: "Appointment Scheduling",
    icon: Calendar,
    description:
      "Automate booking, rescheduling, and reminders 24/7. Sync with Google Calendar, Outlook, or your EHR. Reduce no-shows by 40%.",
    stats: "40% fewer no-shows",
  },
  {
    slug: "order-processing",
    name: "Order Processing",
    icon: ShoppingCart,
    description:
      "AI agents take orders over the phone, upsell intelligently, and confirm details -- all without human intervention. Perfect for restaurants and retail.",
    stats: "15% larger orders",
  },
  {
    slug: "payment-collection",
    name: "Payment Collection",
    icon: CreditCard,
    description:
      "Collect payments securely during voice calls with PCI-compliant Stripe integration. Process invoices, subscriptions, and one-time payments.",
    stats: "30% faster collections",
  },
  {
    slug: "customer-support",
    name: "Customer Support",
    icon: Headphones,
    description:
      "Resolve common support requests instantly. Create tickets, check order status, troubleshoot issues, and escalate to humans when needed.",
    stats: "70% auto-resolved",
  },
  {
    slug: "after-hours-answering",
    name: "After-Hours Answering",
    icon: Moon,
    description:
      "Never miss a call again. AI agents answer after hours, capture leads, schedule callbacks, and handle urgent requests around the clock.",
    stats: "100% call coverage",
  },
];

export default function SolutionsPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://callsphere.tech" },
          { name: "Solutions", url: "https://callsphere.tech/solutions" },
        ]}
      />
      <Nav />
      <main id="main" className="relative">
        <section className="section-shell pt-16 pb-12">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Solutions
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              From scheduling appointments to collecting payments, CallSphere AI
              voice agents handle end-to-end workflows so your team can focus on
              what matters.
            </p>
          </div>
        </section>

        <section className="section-stack pb-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="grid gap-6">
              {solutions.map((solution) => {
                const Icon = solution.icon;
                return (
                  <Link
                    key={solution.slug}
                    href={`/solutions/${solution.slug}`}
                    className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-md sm:flex-row sm:items-start"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {solution.name}
                        </h3>
                        <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          {solution.stats}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {solution.description}
                      </p>
                      <span className="mt-3 inline-flex items-center text-sm font-medium text-indigo-600 group-hover:underline">
                        Learn more
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
