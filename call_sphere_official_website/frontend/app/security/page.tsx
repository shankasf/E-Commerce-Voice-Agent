import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SectionHeading } from "@/components/SectionHeading";
import { Shield, Lock, Eye, Server, Users, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Security | CallSphere",
  description:
    "How CallSphere protects your data. TLS encryption, role-based access controls, PCI-DSS payment security, SOC 2 alignment, HIPAA support, and incident response.",
  alternates: {
    canonical: "https://callsphere.tech/security",
  },
  openGraph: {
    title: "Security | CallSphere",
    description:
      "How CallSphere protects your data. Encryption, access controls, PCI-DSS payments, SOC 2, and HIPAA support.",
    url: "https://callsphere.tech/security",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Security | CallSphere",
    description:
      "How CallSphere protects your data. Encryption, access controls, PCI-DSS payments, SOC 2, and HIPAA support.",
  },
};

export default function SecurityPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading
            title="Security"
            description="How we protect your data and maintain the security of our platform."
            align="center"
          />

          <div className="mt-12 space-y-8 text-slate-700 leading-relaxed">
            <p className="text-sm text-slate-500">
              <strong>Last Updated:</strong> January 19, 2026
            </p>

            {/* Security Overview */}
            <section className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600" />
                Our Security Commitment
              </h2>
              <p>
                CallSphere is committed to protecting your data. We implement security measures appropriate for a growing SaaS platform and continuously work to improve our security posture. Security documentation is available on request for prospective enterprise customers.
              </p>
            </section>

            {/* Data Encryption */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-slate-600" />
                Data Encryption
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>In Transit:</strong> All data transmitted to and from our services uses TLS/HTTPS encryption.</li>
                <li><strong>At Rest:</strong> Data at rest is encrypted where supported by our cloud infrastructure providers (AWS, Vercel).</li>
              </ul>
            </section>

            {/* Access Controls */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-600" />
                Access Controls
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Role-Based Access:</strong> Access to customer data is restricted to authorized personnel based on job function.</li>
                <li><strong>Admin Logging:</strong> Administrative actions are logged for security monitoring and audit purposes.</li>
                <li><strong>Principle of Least Privilege:</strong> Team members are granted the minimum access necessary to perform their duties.</li>
              </ul>
            </section>

            {/* Infrastructure */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Server className="h-5 w-5 text-slate-600" />
                Infrastructure Security
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Cloud Hosting:</strong> Our services are hosted on reputable cloud providers (AWS, Vercel) that maintain their own security certifications.</li>
                <li><strong>Database Security:</strong> Production databases are isolated and access is restricted.</li>
                <li><strong>Regular Updates:</strong> We regularly update dependencies and apply security patches.</li>
              </ul>
            </section>

            {/* Payment Security */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-600" />
                Payment Security
              </h2>
              <p>
                Payments are processed by PCI-DSS compliant providers (e.g., Stripe). We do not store credit card numbers, CVVs, or other sensitive payment details on our servers. All payment data is handled directly by our payment processor.
              </p>
            </section>

            {/* AI & Data Handling */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 text-slate-600" />
                AI and Data Handling
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Third-Party AI Providers:</strong> We use OpenAI and other AI providers to power our voice and chat agents. Data sent to these providers is subject to their respective privacy policies.</li>
                <li><strong>Guardrails:</strong> We implement guardrails to help keep AI responses on-topic and within defined boundaries.</li>
                <li><strong>Human-in-the-Loop:</strong> Options for human review and escalation are available for sensitive use cases.</li>
                <li><strong>Response Verification:</strong> AI responses may require verification for critical actions. We do not guarantee error-free AI outputs.</li>
              </ul>
            </section>

            {/* Compliance */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-600" />
                Compliance and Certifications
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>SOC 2:</strong> Our security program is aligned with SOC 2 principles. Formal SOC 2 audit is planned.</li>
                <li><strong>HIPAA:</strong> HIPAA support is available for healthcare customers with a signed BAA and eligible infrastructure configuration. Contact us for details.</li>
                <li><strong>GDPR/CPRA:</strong> We support GDPR and CPRA rights requests (access, delete, export). A Data Processing Addendum (DPA) is available for business customers.</li>
              </ul>
            </section>

            {/* Incident Response */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Incident Response</h2>
              <p>
                In the event of a security incident affecting customer data, we will notify affected customers in accordance with applicable laws and our contractual obligations.
              </p>
            </section>

            {/* Responsible Disclosure */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Responsible Disclosure</h2>
              <p>
                If you discover a security vulnerability in our platform, please report it to us at{" "}
                <a href="mailto:sagar@callsphere.tech" className="text-blue-600 hover:underline">
                  sagar@callsphere.tech
                </a>
                . We appreciate responsible disclosure and will work with you to address any valid security concerns.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Contact Us</h2>
              <div className="bg-slate-100 rounded-lg p-6">
                <p className="font-semibold text-slate-900">CallSphere</p>
                <p className="mt-2">
                  Email: <a href="mailto:sagar@callsphere.tech" className="text-blue-600 hover:underline">sagar@callsphere.tech</a>
                </p>
                <p className="mt-4 text-sm text-slate-600">
                  For security documentation requests or enterprise security questionnaires, please contact us at the email above.
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
