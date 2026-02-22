import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - CallSphere",
  description:
    "CallSphere Privacy Policy. Learn how we collect, use, and protect your personal data. Covers GDPR, CPRA, and HIPAA compliance.",
  alternates: {
    canonical: "https://callsphere.tech/privacy",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
