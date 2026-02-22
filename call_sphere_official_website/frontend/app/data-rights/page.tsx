import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SectionHeading } from "@/components/SectionHeading";
import { Download, Trash2, Eye, Edit, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Data Rights | GDPR & CPRA Requests | CallSphere",
  description:
    "Exercise your data privacy rights under GDPR and CPRA. Request access, correction, deletion, or export of your personal data from CallSphere.",
  alternates: {
    canonical: "https://callsphere.tech/data-rights",
  },
  openGraph: {
    title: "Data Rights | GDPR & CPRA Requests | CallSphere",
    description:
      "Exercise your data privacy rights under GDPR and CPRA. Request access, correction, deletion, or export of your data.",
    url: "https://callsphere.tech/data-rights",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Data Rights | GDPR & CPRA Requests | CallSphere",
    description:
      "Exercise your data privacy rights under GDPR and CPRA. Request access, correction, deletion, or export of your data.",
  },
};

export default function DataRightsPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading
            title="Data Rights"
            description="How to exercise your data privacy rights under GDPR, CPRA, and other applicable laws."
            align="center"
          />

          <div className="mt-12 space-y-8 text-slate-700 leading-relaxed">
            <p className="text-sm text-slate-500">
              <strong>Last Updated:</strong> January 19, 2026
            </p>

            {/* Overview */}
            <section>
              <p>
                CallSphere respects your privacy rights. Depending on where you live, you may have certain rights
                regarding your personal data under laws such as the General Data Protection Regulation (GDPR),
                California Privacy Rights Act (CPRA), and other privacy regulations.
              </p>
              <p className="mt-3">
                This page explains what rights you have and how to exercise them.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Rights</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-slate-900">Right to Access</h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    Request a copy of the personal data we hold about you.
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Edit className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-slate-900">Right to Correction</h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    Request that we correct inaccurate or incomplete personal data.
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trash2 className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-slate-900">Right to Deletion</h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    Request that we delete your personal data, subject to legal retention requirements.
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-slate-900">Right to Export</h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    Request a copy of your data in a portable, machine-readable format.
                  </p>
                </div>
              </div>
            </section>

            {/* How to Submit a Request */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">How to Submit a Request</h2>
              <p>
                To exercise any of these rights, please submit a request using one of the following methods:
              </p>

              <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                  <Mail className="h-5 w-5 text-indigo-600" />
                  Email Request
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Send an email to our privacy team with your request. Please include:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-sm text-slate-600">
                  <li>Your full name and email address associated with your account</li>
                  <li>The specific right you wish to exercise (access, correction, deletion, or export)</li>
                  <li>Any additional details that may help us locate your data</li>
                </ul>
                <div className="mt-4">
                  <a
                    href="mailto:sagar@callsphere.tech?subject=Data%20Rights%20Request"
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Email sagar@callsphere.tech
                  </a>
                </div>
              </div>
            </section>

            {/* Verification */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Identity Verification</h2>
              <p>
                To protect your privacy, we may need to verify your identity before processing your request.
                We may ask you to provide information that matches our records, such as:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>The email address associated with your account</li>
                <li>Recent activity or transaction details</li>
                <li>Other identifying information we have on file</li>
              </ul>
              <p className="mt-3">
                We will not fulfill requests if we cannot verify your identity.
              </p>
            </section>

            {/* Response Time */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Response Time</h2>
              <p>
                We aim to respond to all data rights requests within 30 days. If we need more time due to the
                complexity of your request, we will notify you and explain the reason for the delay.
              </p>
              <p className="mt-3">
                For GDPR requests, we will respond within one month. For CPRA requests, we will respond within 45 days.
                Extensions may be required for complex requests as permitted by law.
              </p>
            </section>

            {/* Limitations */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Limitations</h2>
              <p>
                In some cases, we may not be able to fulfill your request in whole or in part due to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>Legal obligations that require us to retain certain data</li>
                <li>Legitimate business purposes (e.g., fraud prevention, security)</li>
                <li>Rights of other individuals</li>
                <li>Requests that are manifestly unfounded or excessive</li>
              </ul>
              <p className="mt-3">
                If we cannot fulfill your request, we will explain the reason.
              </p>
            </section>

            {/* No Discrimination */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Non-Discrimination</h2>
              <p>
                We will not discriminate against you for exercising your privacy rights. You will not receive
                different pricing or service quality for submitting a data rights request.
              </p>
            </section>

            {/* Authorized Agents */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Authorized Agents</h2>
              <p>
                You may designate an authorized agent to submit a request on your behalf. To do so, please provide
                written authorization (such as a signed letter or power of attorney) along with the request.
                We may still require verification of your identity directly.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Contact Us</h2>
              <p>
                If you have questions about your data rights or need assistance submitting a request, please contact us:
              </p>
              <div className="mt-4 bg-slate-100 rounded-lg p-6">
                <p className="font-semibold text-slate-900">CallSphere</p>
                <p className="mt-2">
                  Email: <a href="mailto:sagar@callsphere.tech" className="text-blue-600 hover:underline">sagar@callsphere.tech</a>
                </p>
                <p className="mt-4 text-sm text-slate-600">
                  We are committed to helping you exercise your privacy rights.
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
