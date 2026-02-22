import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subprocessors - CallSphere",
  description:
    "List of third-party subprocessors used by CallSphere for cloud infrastructure, AI models, telephony, payments, and email delivery.",
  alternates: {
    canonical: "https://callsphere.tech/subprocessors",
  },
};

export default function SubprocessorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
