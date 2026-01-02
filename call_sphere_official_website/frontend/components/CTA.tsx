import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section
      id="cta"
      aria-label="Final call to action"
      className="section-stack"
    >
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-8 py-16 text-center sm:px-16">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Ready to transform your customer support?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Book a 30-minute walkthrough to see how CallSphere AI agents reduce costs,
          cut response times, and improve customer satisfaction.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Book a Demo
            <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            See Pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
