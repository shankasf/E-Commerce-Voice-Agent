import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security & Compliance | CallSphere AI Platform",
  description:
    "CallSphere security: TLS encryption, SOC 2 aligned, HIPAA with BAA, GDPR/CPRA compliant, PCI-DSS payment processing. Enterprise-grade data protection.",
  alternates: {
    canonical: "https://callsphere.tech/security",
  },
};

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
