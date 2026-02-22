import { Metadata } from "next";
import Link from "next/link";
import {
  Phone,
  Users,
  CreditCard,
  ShoppingCart,
  Wrench,
  Monitor,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { BreadcrumbJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Integrations | Connect CallSphere AI Agents to Your Stack",
  description:
    "CallSphere integrates with Twilio, Salesforce, HubSpot, Zendesk, Stripe, Shopify, ServiceTitan, ConnectWise, and Freshdesk. Connect AI voice and chat agents to your existing tools.",
  alternates: {
    canonical: "https://callsphere.tech/integrations",
  },
  openGraph: {
    title: "Integrations | Connect CallSphere AI Agents to Your Stack",
    description:
      "Connect AI voice and chat agents to Twilio, Salesforce, HubSpot, Zendesk, Stripe, and more.",
    url: "https://callsphere.tech/integrations",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Integrations | Connect CallSphere AI Agents to Your Stack",
    description:
      "Connect AI voice and chat agents to Twilio, Salesforce, HubSpot, Zendesk, Stripe, and more.",
  },
};

const integrations = [
  {
    slug: "twilio",
    name: "Twilio",
    category: "Telephony",
    icon: Phone,
    description:
      "Enterprise-grade telephony backbone for inbound/outbound calls, SMS, and global phone numbers.",
  },
  {
    slug: "salesforce",
    name: "Salesforce",
    category: "CRM",
    icon: Users,
    description:
      "Sync call data, create leads, and update records automatically in Salesforce CRM.",
  },
  {
    slug: "hubspot",
    name: "HubSpot",
    category: "CRM",
    icon: Users,
    description:
      "Log calls, create contacts, and trigger workflows in HubSpot automatically.",
  },
  {
    slug: "zendesk",
    name: "Zendesk",
    category: "CRM",
    icon: HelpCircle,
    description:
      "Create and update support tickets, escalate to agents, and sync customer data with Zendesk.",
  },
  {
    slug: "stripe",
    name: "Stripe",
    category: "Payment",
    icon: CreditCard,
    description:
      "Process secure payments during voice and chat conversations with PCI-compliant Stripe integration.",
  },
  {
    slug: "shopify",
    name: "Shopify",
    category: "Industry",
    icon: ShoppingCart,
    description:
      "Look up orders, process returns, and answer product questions from your Shopify store.",
  },
  {
    slug: "servicetitan",
    name: "ServiceTitan",
    category: "Industry",
    icon: Wrench,
    description:
      "Book jobs, dispatch technicians, and sync customer records with ServiceTitan for HVAC and trades.",
  },
  {
    slug: "connectwise",
    name: "ConnectWise",
    category: "Industry",
    icon: Monitor,
    description:
      "Create IT tickets, check ticket status, and route support requests through ConnectWise.",
  },
  {
    slug: "freshdesk",
    name: "Freshdesk",
    category: "CRM",
    icon: HelpCircle,
    description:
      "Automate ticket creation, status updates, and customer communication with Freshdesk.",
  },
];

const categories = ["All", "Telephony", "CRM", "Payment", "Industry"];

export default function IntegrationsPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://callsphere.tech" },
          { name: "Integrations", url: "https://callsphere.tech/integrations" },
        ]}
      />
      <Nav />
      <main id="main" className="relative">
        <section className="section-shell pt-16 pb-12">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Integrations
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Connect CallSphere AI voice and chat agents to the tools you
              already use. Sync data, automate workflows, and go live in days.
            </p>
          </div>
        </section>

        <section className="section-stack pb-20">
          <div className="mx-auto max-w-6xl px-6">
            {/* Category pills */}
            <div className="mb-10 flex flex-wrap justify-center gap-2">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600"
                >
                  {cat}
                </span>
              ))}
            </div>

            {/* Integration grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {integrations.map((integration) => {
                const Icon = integration.icon;
                return (
                  <Link
                    key={integration.slug}
                    href={`/integrations/${integration.slug}`}
                    className="group rounded-xl border border-slate-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {integration.name}
                        </h3>
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                          {integration.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {integration.description}
                    </p>
                    <span className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 group-hover:underline">
                      Learn more
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </span>
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
