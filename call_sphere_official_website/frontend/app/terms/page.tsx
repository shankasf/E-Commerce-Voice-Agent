import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Terms of Service | CallSphere",
  description:
    "CallSphere Terms of Service. Subscription plans, acceptable use, data ownership, intellectual property, and dispute resolution for our AI voice and chat platform.",
  alternates: {
    canonical: "https://callsphere.tech/terms",
  },
  openGraph: {
    title: "Terms of Service | CallSphere",
    description:
      "CallSphere Terms of Service covering subscription plans, acceptable use, data ownership, and more.",
    url: "https://callsphere.tech/terms",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service | CallSphere",
    description:
      "CallSphere Terms of Service covering subscription plans, acceptable use, data ownership, and more.",
  },
};

export default function TermsOfServicePage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading
            title="Terms of Service"
            description="Please read these terms carefully before using our services."
            align="center"
          />

          <div className="mt-12 space-y-8 text-slate-700 leading-relaxed">
            <p className="text-sm text-slate-500">
              <strong>Effective Date:</strong> December 28, 2025 | <strong>Last Updated:</strong> December 28, 2025
            </p>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Agreement to Terms</h2>
              <p>
                These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and CallSphere LLC (&quot;CallSphere,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), governing your access to and use of our AI-powered voice agent platform, chatbot agents, and related services (collectively, the &quot;Services&quot;).
              </p>
              <p className="mt-3">
                By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Description of Services</h2>
              <p>
                CallSphere provides enterprise automation solutions including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li><strong>Agentic Voice Agents:</strong> AI-powered voice systems that handle customer interactions, including order placement, customer support, and appointment scheduling.</li>
                <li><strong>Agentic Chatbot Agents:</strong> Text-based intelligent automation for customer communication via SMS, WhatsApp, and web chat.</li>
                <li><strong>Zero-Code Journey Builder:</strong> Tools for designing customer interaction workflows without coding.</li>
                <li><strong>Analytics Dashboard:</strong> Real-time insights into agent performance and customer interactions.</li>
                <li><strong>Integration Services:</strong> Connections to third-party platforms including Shopify, Stripe, Square, Twilio, and others.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Account Registration</h2>
              <p>
                To access certain features of our Services, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
              <p className="mt-3">
                You must be at least 18 years old to create an account. By registering, you represent that you have the authority to bind yourself or your organization to these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Subscription Plans and Pricing</h2>
              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">4.1 Subscription Tiers</h3>
              <p>
                We offer various subscription plans with different features and usage limits. Current pricing and plan details are available on our website and are subject to change with 30 days&apos; notice.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">4.2 Billing and Payment</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Subscription fees are billed in advance on a monthly or annual basis</li>
                <li>All payments are processed through secure, PCI-compliant payment processors</li>
                <li>Fees are non-refundable except as expressly stated in these Terms</li>
                <li>Usage overages will be billed at the rates specified in your subscription plan</li>
              </ul>

              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">4.3 Free Trial</h3>
              <p>
                We may offer free trials at our discretion. At the end of a trial period, your account will automatically convert to a paid subscription unless you cancel before the trial ends.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Acceptable Use</h2>
              <p>You agree not to use the Services to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>Violate any applicable laws, regulations, or third-party rights</li>
                <li>Transmit harmful, fraudulent, or deceptive content</li>
                <li>Engage in unauthorized telemarketing, spam, or unsolicited communications</li>
                <li>Impersonate any person or entity or misrepresent your affiliation</li>
                <li>Interfere with or disrupt the Services or servers</li>
                <li>Attempt to gain unauthorized access to any systems or networks</li>
                <li>Use the Services for illegal robocalling or in violation of TCPA, GDPR, or other regulations</li>
                <li>Process payments for illegal goods or services</li>
                <li>Reverse engineer, decompile, or disassemble any aspect of the Services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Your Content and Data</h2>
              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">6.1 Ownership</h3>
              <p>
                You retain all rights to your content, including voice recordings, transcripts, customer data, and workflow configurations (&quot;Your Content&quot;). By using our Services, you grant us a limited license to process Your Content solely to provide the Services.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">6.2 Data Processing</h3>
              <p>
                We process Your Content in accordance with our Privacy Policy and applicable data protection laws. For enterprise clients requiring specific data processing terms, we offer Data Processing Agreements (DPAs) upon request.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">6.3 Aggregated Data</h3>
              <p>
                We may use anonymized and aggregated data derived from Your Content to improve our Services, develop new features, and for analytical purposes, provided such data cannot be used to identify you or your customers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Intellectual Property</h2>
              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">7.1 Our Intellectual Property</h3>
              <p>
                The Services, including all software, algorithms, AI models, designs, trademarks, and documentation, are owned by CallSphere and protected by intellectual property laws. These Terms do not grant you any rights to our intellectual property except the limited license to use the Services.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">7.2 Feedback</h3>
              <p>
                If you provide feedback, suggestions, or ideas about our Services, you grant us an unrestricted, perpetual, royalty-free license to use such feedback for any purpose without compensation to you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Third-Party Integrations</h2>
              <p>
                Our Services integrate with third-party platforms (e.g., Shopify, Stripe, Twilio). Your use of these integrations is subject to the respective third party&apos;s terms of service. We are not responsible for third-party services, and any issues with integrations should be directed to the relevant provider.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Service Level and Support</h2>
              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">9.1 Availability</h3>
              <p>
                We strive to maintain 99.9% uptime for our Services. However, we do not guarantee uninterrupted service and may perform scheduled maintenance with reasonable notice.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">9.2 Support</h3>
              <p>
                Support is available during business hours (9am - 7pm ET) via email and phone. Enterprise plans include priority support and dedicated account management.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Disclaimers</h2>
              <p className="uppercase font-medium">
                THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p className="mt-3">
                We do not warrant that the Services will be uninterrupted, error-free, or completely secure. AI-generated responses may occasionally be inaccurate, and you are responsible for reviewing and validating outputs.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">11. Limitation of Liability</h2>
              <p className="uppercase font-medium">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, CALLSPHERE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES ARISING FROM YOUR USE OF THE SERVICES.
              </p>
              <p className="mt-3">
                OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICES SHALL NOT EXCEED THE AMOUNTS PAID BY YOU TO CALLSPHERE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">12. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless CallSphere and its officers, directors, employees, and agents from any claims, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising from:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>Your use of the Services</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Your Content or data processed through the Services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">13. Termination</h2>
              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">13.1 Termination by You</h3>
              <p>
                You may terminate your account at any time by contacting us. Termination will be effective at the end of your current billing period.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">13.2 Termination by Us</h3>
              <p>
                We may suspend or terminate your access to the Services immediately if you violate these Terms, fail to pay fees when due, or engage in conduct that harms our Services or other users.
              </p>

              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">13.3 Effect of Termination</h3>
              <p>
                Upon termination, your right to use the Services will cease immediately. We will retain Your Content for 30 days to allow for data export, after which it may be deleted.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">14. Governing Law and Disputes</h2>
              <p>
                These Terms are governed by the laws of the State of New York, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved through binding arbitration administered by the American Arbitration Association, except that either party may seek injunctive relief in court for intellectual property violations.
              </p>
              <p className="mt-3">
                You agree to waive any right to a jury trial or to participate in a class action lawsuit against CallSphere.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">15. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on our website and updating the &quot;Last Updated&quot; date. Your continued use of the Services after changes become effective constitutes your acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">16. General Provisions</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and CallSphere.</li>
                <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions will continue in effect.</li>
                <li><strong>Waiver:</strong> Our failure to enforce any right does not constitute a waiver of that right.</li>
                <li><strong>Assignment:</strong> You may not assign these Terms without our consent. We may assign these Terms freely.</li>
                <li><strong>Force Majeure:</strong> We are not liable for delays or failures caused by circumstances beyond our reasonable control.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">17. Contact Information</h2>
              <p>
                For questions about these Terms of Service, please contact us:
              </p>
              <div className="mt-4 bg-slate-100 rounded-lg p-6">
                <p className="font-semibold text-slate-900">CallSphere LLC</p>
                <p>27 Orchard Pl</p>
                <p>New York, NY</p>
                <p className="mt-2">
                  Email: <a href="mailto:sagar@callsphere.tech" className="text-blue-600 hover:underline">sagar@callsphere.tech</a>
                </p>
                <p>
                  Phone: <a href="tel:+18453884261" className="text-blue-600 hover:underline">(845) 388-4261</a>
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
