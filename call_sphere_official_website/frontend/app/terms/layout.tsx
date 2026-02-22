import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - CallSphere",
  description:
    "CallSphere Terms of Service. Review our subscription plans, acceptable use policy, SLA commitments, and governing terms.",
  alternates: {
    canonical: "https://callsphere.tech/terms",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
