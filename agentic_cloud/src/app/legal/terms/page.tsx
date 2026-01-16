import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Agentic Cloud by CallSphere",
};

export default function TermsPage() {
  return (
    <div className="pt-24 pb-16">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Terms of Service
          </h1>

          <p className="text-gray-500 mb-8">Last updated: January 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Agreement to Terms
            </h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using Agentic Cloud (the "Service") operated by
              CallSphere LLC ("Company," "we," "us," or "our"), you agree to be
              bound by these Terms of Service. If you disagree with any part of
              these terms, you may not access the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Agentic Cloud is a cloud infrastructure platform that enables
              users to provision and manage cloud resources using natural
              language prompts. The Service includes web-based tools, APIs,
              CLIs, and related documentation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Account Registration
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              To use certain features of the Service, you must register for an
              account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update any changes to your information</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Acceptable Use
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Distribute malware or malicious content</li>
              <li>Engage in unauthorized access or hacking</li>
              <li>Send spam or unsolicited communications</li>
              <li>Interfere with the Service's operation</li>
              <li>Resell the Service without authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Payment and Billing
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you subscribe to paid features:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>
                You agree to pay all fees associated with your subscription
              </li>
              <li>Fees are billed in advance on a recurring basis</li>
              <li>All payments are non-refundable unless otherwise stated</li>
              <li>We may change pricing with 30 days' notice</li>
              <li>
                Failure to pay may result in suspension or termination
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Intellectual Property
            </h2>
            <p className="text-gray-600 leading-relaxed">
              The Service and its original content, features, and functionality
              are owned by CallSphere LLC and are protected by international
              copyright, trademark, and other intellectual property laws. You
              retain ownership of any content you submit to the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. User Content
            </h2>
            <p className="text-gray-600 leading-relaxed">
              You are responsible for any content you submit to the Service. By
              submitting content, you grant us a non-exclusive, worldwide,
              royalty-free license to use, reproduce, and display such content
              as necessary to provide the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Service Availability
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We strive to maintain high availability but do not guarantee
              uninterrupted access to the Service. We may modify, suspend, or
              discontinue the Service at any time with or without notice. We are
              not liable for any modification, suspension, or discontinuation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Disclaimer of Warranties
            </h2>
            <p className="text-gray-600 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
              WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT
              NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR
              A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Limitation of Liability
            </h2>
            <p className="text-gray-600 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CALLSPHERE INC. SHALL NOT
              BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER
              INCURRED DIRECTLY OR INDIRECTLY.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Indemnification
            </h2>
            <p className="text-gray-600 leading-relaxed">
              You agree to indemnify and hold harmless CallSphere LLC and its
              officers, directors, employees, and agents from any claims,
              damages, losses, liabilities, and expenses arising from your use
              of the Service or violation of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Termination
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We may terminate or suspend your account and access to the Service
              immediately, without prior notice, for any reason, including
              breach of these Terms. Upon termination, your right to use the
              Service will cease immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              13. Governing Law
            </h2>
            <p className="text-gray-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with
              the laws of the State of California, United States, without regard
              to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              14. Changes to Terms
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will
              provide notice of material changes by posting the updated Terms on
              this page. Your continued use of the Service after changes
              constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              15. Contact Us
            </h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about these Terms, please contact us at:
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
