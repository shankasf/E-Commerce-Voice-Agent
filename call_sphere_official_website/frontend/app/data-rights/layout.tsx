import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Rights - CallSphere",
  description:
    "Exercise your data rights with CallSphere. Access, correct, delete, or export your personal data under GDPR, CPRA, and other privacy regulations.",
  alternates: {
    canonical: "https://callsphere.tech/data-rights",
  },
};

export default function DataRightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
