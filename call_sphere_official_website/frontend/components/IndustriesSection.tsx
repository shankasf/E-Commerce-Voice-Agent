import { Building2, Stethoscope, Monitor, Truck } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const industries = [
  {
    name: "Property Management",
    icon: Building2,
    phone: "+1 (555) 100-2001",
    description: "Automate maintenance triage, leasing qualification, and rent inquiries. Handle high call volumes 24/7 so your team can focus on growth.",
    features: ["Maintenance Triage", "Leasing Qualification", "Rent & Payment Support"],
    stat: "95%",
    statLabel: "requests triaged",
  },
  {
    name: "Healthcare & Dental",
    icon: Stethoscope,
    phone: "+1 (555) 100-2002",
    description: "Manage appointments, verify insurance, and reduce no-shows with proactive reminders. Every patient call answered.",
    features: ["Appointment Scheduling", "Insurance Verification", "No-Show Reduction"],
    stat: "40%",
    statLabel: "fewer no-shows",
  },
  {
    name: "IT Support",
    icon: Monitor,
    phone: "+1 (555) 100-2003",
    description: "Deflect Tier-1 tickets, auto-create categorized tickets, and provide instant status updates without human intervention.",
    features: ["Ticket Triage & Creation", "Smart Escalation", "Status Updates"],
    stat: "60%",
    statLabel: "faster resolution",
  },
  {
    name: "Logistics & Delivery",
    icon: Truck,
    phone: "+1 (555) 100-2004",
    description: "Real-time order status, exception handling, and rescheduling. Handle urgent inquiries with accurate, instant responses.",
    features: ["Order Tracking", "Exception Handling", "Redelivery Scheduling"],
    stat: "24/7",
    statLabel: "availability",
  },
];

export function IndustriesSection() {
  return (
    <section id="industries" className="section-stack">
      <SectionHeading
        eyebrow="Industries"
        title="Built for the unique needs of large B2C enterprises"
        description="Use AI to modernize customer support at scale while staying aligned with your proprietary products, brand voice, processes, and compliance requirements."
        align="center"
      />

      {/* Industry Grid - Bujo style */}
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {industries.map((industry) => {
          const Icon = industry.icon;
          return (
            <div
              key={industry.name}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-slate-200">
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                {industry.name}
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {industry.description}
              </p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{industry.stat}</span>
                <span className="text-sm text-slate-500">{industry.statLabel}</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {industry.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Demo Phone Numbers Banner - Live AI Voice */}
      <div className="mt-20 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white px-6 py-12 sm:px-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-green-700">AI Agents Online</span>
          </div>
          <h3 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Talk to Our AI Voice Agent
          </h3>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Call any demo line below and speak with our AI instantly. No signup required.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((industry) => {
            const Icon = industry.icon;
            return (
              <a
                key={industry.name}
                href={`tel:${industry.phone.replace(/[^+\d]/g, '')}`}
                className="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white transition group-hover:scale-110">
                  <Icon className="h-7 w-7" />
                </div>
                <p className="mt-4 font-semibold text-slate-900">{industry.name}</p>
                <p className="mt-1 text-lg font-bold text-indigo-600">{industry.phone}</p>
              </a>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          Available 24/7 · 57+ Languages Supported
        </p>
      </div>
    </section>
  );
}
