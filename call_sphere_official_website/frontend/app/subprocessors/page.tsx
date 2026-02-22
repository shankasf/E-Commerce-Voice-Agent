import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Subprocessors | CallSphere",
  description:
    "List of third-party service providers (subprocessors) CallSphere uses to deliver our AI voice and chat platform, including AWS, OpenAI, Twilio, and Stripe.",
  alternates: {
    canonical: "https://callsphere.tech/subprocessors",
  },
  openGraph: {
    title: "Subprocessors | CallSphere",
    description:
      "Third-party service providers that help CallSphere deliver AI voice and chat agent services.",
    url: "https://callsphere.tech/subprocessors",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Subprocessors | CallSphere",
    description:
      "Third-party service providers that help CallSphere deliver AI voice and chat agent services.",
  },
};

const subprocessors = [
  {
    name: "Amazon Web Services (AWS)",
    purpose: "Cloud infrastructure, hosting, and data storage",
    location: "United States",
    link: "https://aws.amazon.com/privacy/",
  },
  {
    name: "Vercel",
    purpose: "Application hosting and deployment",
    location: "United States",
    link: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "OpenAI",
    purpose: "AI language models for voice and chat agents",
    location: "United States",
    link: "https://openai.com/policies/privacy-policy",
  },
  {
    name: "Twilio",
    purpose: "Telephony and voice communication services",
    location: "United States",
    link: "https://www.twilio.com/legal/privacy",
  },
  {
    name: "Stripe",
    purpose: "Payment processing",
    location: "United States",
    link: "https://stripe.com/privacy",
  },
  {
    name: "MongoDB Atlas",
    purpose: "Database hosting and management",
    location: "United States",
    link: "https://www.mongodb.com/legal/privacy-policy",
  },
  {
    name: "Resend",
    purpose: "Transactional email delivery",
    location: "United States",
    link: "https://resend.com/legal/privacy-policy",
  },
];

export default function SubprocessorsPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading
            title="Subprocessors"
            description="Third-party service providers that help us deliver our services."
            align="center"
          />

          <div className="mt-12 space-y-8 text-slate-700 leading-relaxed">
            <p className="text-sm text-slate-500">
              <strong>Last Updated:</strong> January 19, 2026
            </p>

            <section>
              <p>
                CallSphere uses the following third-party service providers (subprocessors) to help deliver our Services.
                Each subprocessor has been selected based on their ability to provide appropriate security and privacy protections.
              </p>
            </section>

            {/* Subprocessors Table */}
            <section className="mt-8">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900">
                        Subprocessor
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900">
                        Purpose
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900">
                        Location
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900">
                        Privacy Policy
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subprocessors.map((sp, index) => (
                      <tr key={sp.name} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900">
                          {sp.name}
                        </td>
                        <td className="border border-slate-200 px-4 py-3 text-sm text-slate-600">
                          {sp.purpose}
                        </td>
                        <td className="border border-slate-200 px-4 py-3 text-sm text-slate-600">
                          {sp.location}
                        </td>
                        <td className="border border-slate-200 px-4 py-3 text-sm">
                          <a
                            href={sp.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View Policy
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Additional Information */}
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Updates to This List</h2>
              <p>
                We may update this list from time to time as we add or change subprocessors.
                If you have a Data Processing Addendum (DPA) with us that includes subprocessor notification provisions,
                we will notify you of any changes in accordance with those terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Data Processing Addendum</h2>
              <p>
                Business customers who require a Data Processing Addendum (DPA) that covers our use of subprocessors
                can request one by contacting us at{" "}
                <a href="mailto:sagar@callsphere.tech" className="text-blue-600 hover:underline">
                  sagar@callsphere.tech
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Questions</h2>
              <p>
                If you have questions about our subprocessors or data processing practices, please contact us:
              </p>
              <div className="mt-4 bg-slate-100 rounded-lg p-6">
                <p className="font-semibold text-slate-900">CallSphere</p>
                <p className="mt-2">
                  Email: <a href="mailto:sagar@callsphere.tech" className="text-blue-600 hover:underline">sagar@callsphere.tech</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
