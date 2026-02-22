import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Privacy Policy | CallSphere",
  description:
    "Learn how CallSphere collects, uses, and protects your information. GDPR & CPRA compliant. Data encryption, retention policies, and your privacy rights.",
  alternates: {
    canonical: "https://callsphere.tech/privacy",
  },
  openGraph: {
    title: "Privacy Policy | CallSphere",
    description:
      "Learn how CallSphere collects, uses, and protects your information. GDPR & CPRA compliant.",
    url: "https://callsphere.tech/privacy",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | CallSphere",
    description:
      "Learn how CallSphere collects, uses, and protects your information. GDPR & CPRA compliant.",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading
            title="Privacy Policy"
            description="Your privacy is important to us. This policy explains how we collect, use, and protect your information."
            align="center"
          />

          <div className="mt-12 space-y-8 text-slate-700 leading-relaxed">
            <p className="text-sm text-slate-500">
              <strong>Effective Date:</strong> December 28, 2025 | <strong>Last Updated:</strong> December 28, 2025
            </p>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Introduction</h2>
              <p>
                CallSphere LLC (&quot;CallSphere,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy describes how we collect, use, disclose, and safeguard your information when you use our AI-powered voice agent platform and related services (collectively, the &quot;Services&quot;).
              </p>
              <p className="mt-3">
                By accessing or using our Services, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies, please do not use our Services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Information We Collect</h2>

              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">2.1 Information You Provide</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Account Information:</strong> Name, email address, phone number, company name, and billing information when you register for our Services.</li>
                <li><strong>Communication Data:</strong> Voice recordings, transcripts, chat logs, and related metadata when you interact with our AI agents.</li>
                <li><strong>Payment Information:</strong> Credit card details and billing addresses processed through PCI-compliant payment processors (Stripe, Square).</li>
                <li><strong>Support Requests:</strong> Information you provide when contacting our support team.</li>
              </ul>

              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">2.2 Information Collected Automatically</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Usage Data:</strong> Information about how you interact with our Services, including session duration, features used, and interaction patterns.</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers.</li>
                <li><strong>Analytics Data:</strong> Aggregated data about voice agent performance, customer satisfaction scores, and workflow metrics.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">3. How We Use Your Information</h2>
              <p>We use the information we collect for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>To provide, maintain, and improve our AI voice agent and chatbot Services</li>
                <li>To process transactions and send related information, including purchase confirmations</li>
                <li>To train and improve our AI models (using anonymized and aggregated data only)</li>
                <li>To provide customer support and respond to your inquiries</li>
                <li>To send administrative information, such as updates to our terms and policies</li>
                <li>To detect, prevent, and address technical issues, fraud, or security concerns</li>
                <li>To comply with legal obligations and enforce our terms of service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Data Security</h2>
              <p>
                We implement security measures to protect your information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li><strong>Payment Processing:</strong> Payments are processed by PCI-DSS compliant providers (e.g., Stripe). We do not store card details on our servers.</li>
                <li><strong>Data Protection:</strong> Personal information is stored with role-based access controls and encryption where supported by our infrastructure.</li>
                <li><strong>Encryption:</strong> Encryption in transit (TLS/HTTPS) and encryption at rest where supported by our cloud providers.</li>
                <li><strong>Audit Logging:</strong> Admin actions are logged for security monitoring.</li>
                <li><strong>Access Controls:</strong> Role-based access controls restrict sensitive operations to authorized personnel only.</li>
              </ul>
              <p className="mt-3">
                For more details about our security practices, please visit our <a href="/security" className="text-blue-600 hover:underline">Security page</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Data Sharing and Disclosure</h2>
              <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li><strong>Service Providers:</strong> With third-party vendors who assist in providing our Services (e.g., Twilio for telephony, Stripe for payments, cloud hosting providers).</li>
                <li><strong>Business Clients:</strong> If you interact with a voice agent deployed by one of our business clients, relevant interaction data may be shared with that client.</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental authority.</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Data Retention</h2>
              <p>
                We retain your information for as long as necessary to provide our Services and fulfill the purposes described in this policy. Specifically:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>Account information is retained while your account is active and for 30 days after deletion request.</li>
                <li>Voice recordings and transcripts are retained according to your subscription plan settings (default: 90 days).</li>
                <li>Analytics and aggregated data may be retained indefinitely in anonymized form.</li>
                <li>Payment records are retained as required by applicable tax and financial regulations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Your Rights and Choices (GDPR/CPRA)</h2>
              <p>We support GDPR and CPRA rights requests. Depending on your location, you may have the following rights:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information.</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal retention requirements.</li>
                <li><strong>Portability/Export:</strong> Request your data in a structured, machine-readable format.</li>
                <li><strong>Opt-Out:</strong> Opt out of marketing communications at any time.</li>
                <li><strong>Withdraw Consent:</strong> Where processing is based on consent, you may withdraw it at any time.</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, please visit our <a href="/data-rights" className="text-blue-600 hover:underline">Data Rights page</a> or contact us at <a href="mailto:sagar@callsphere.tech" className="text-blue-600 hover:underline">sagar@callsphere.tech</a>.
              </p>
              <p className="mt-3">
                For business customers requiring a Data Processing Addendum (DPA), please contact us at <a href="mailto:sagar@callsphere.tech" className="text-blue-600 hover:underline">sagar@callsphere.tech</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Healthcare Customers (HIPAA)</h2>
              <p>
                HIPAA support is available for healthcare customers with a signed Business Associate Agreement (BAA) and eligible infrastructure configuration. If you are a covered entity or business associate under HIPAA, please contact us at <a href="mailto:sagar@callsphere.tech" className="text-blue-600 hover:underline">sagar@callsphere.tech</a> to discuss BAA requirements before transmitting protected health information (PHI) through our Services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Children&apos;s Privacy</h2>
              <p>
                Our Services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">10. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers in compliance with applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date. Your continued use of our Services after changes become effective constitutes your acceptance of the revised policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">12. Contact Us</h2>
              <p>
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="mt-4 bg-slate-100 rounded-lg p-6">
                <p className="font-semibold text-slate-900">CallSphere LLC</p>
                <p>27 Orchard Pl</p>
                <p>New York, NY</p>
                <p className="mt-4">
                  Email: <a href="mailto:sagar@callsphere.tech" className="text-blue-600 hover:underline">sagar@callsphere.tech</a>
                </p>
                <p className="mt-2">
                  Phone: <a href="tel:+18453884261" className="text-blue-600 hover:underline">(845) 388-4261</a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">13. Subprocessors</h2>
              <p>
                We use third-party service providers (subprocessors) to help deliver our Services. For a current list of our subprocessors and their purposes, please visit our <a href="/subprocessors" className="text-blue-600 hover:underline">Subprocessors page</a>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
