import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Agentic Cloud by CallSphere",
};

export default function PrivacyPage() {
  return (
    <div className="pt-24 pb-16">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Privacy Policy
          </h1>

          <p className="text-gray-500 mb-8">Last updated: January 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Introduction
            </h2>
            <p className="text-gray-600 leading-relaxed">
              CallSphere LLC ("we," "our," or "us") operates Agentic Cloud
              (cloud.callsphere.tech). This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you
              use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Information We Collect
            </h2>
            <h3 className="text-xl font-medium text-gray-900 mb-3">
              Personal Information
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              When you register for an account or join our waitlist, we may
              collect:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Name and email address</li>
              <li>Company name and job title</li>
              <li>Billing and payment information</li>
              <li>Usage data and preferences</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-900 mb-3">
              Automatically Collected Information
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              We automatically collect certain information when you use our
              services:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>IP address and device information</li>
              <li>Browser type and operating system</li>
              <li>Pages visited and actions taken</li>
              <li>Log data and analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We use the collected information to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide and maintain our services</li>
              <li>Process transactions and send related information</li>
              <li>Send administrative information and updates</li>
              <li>Respond to inquiries and offer support</li>
              <li>Improve our services and develop new features</li>
              <li>Monitor and analyze usage patterns</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Information Sharing
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We do not sell your personal information. We may share your
              information with:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Service providers who assist in our operations</li>
              <li>Professional advisors (lawyers, accountants)</li>
              <li>Law enforcement when required by law</li>
              <li>Business partners with your consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Data Security
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We implement appropriate technical and organizational security
              measures to protect your personal information. This includes
              encryption, access controls, and regular security assessments.
              However, no method of transmission over the Internet is 100%
              secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Your Rights
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Depending on your location, you may have rights to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
              <li>Withdraw consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Cookies and Tracking
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We use cookies and similar tracking technologies to collect
              information about your browsing activities. You can control
              cookies through your browser settings. Some features may not
              function properly if cookies are disabled.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Children's Privacy
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Our services are not intended for children under 13. We do not
              knowingly collect personal information from children under 13. If
              you believe we have collected such information, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Changes to This Policy
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new policy on this page
              and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Contact Us
            </h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about this Privacy Policy, please contact
              us at:
            </p>
            <p className="text-gray-600 mt-4">
              <strong>CallSphere LLC</strong>
              <br />
              Email: sagar@callsphere.tech
              <br />
              Address: 27 Orchard Pl, Poughkeepsie, NY 12601
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
