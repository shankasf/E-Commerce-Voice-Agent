import { Metadata } from "next";
import { SecurityContent } from "./SecurityContent";

export const metadata: Metadata = {
  title: "Security - Enterprise-Grade Protection",
  description:
    "Agentic Cloud is built with security first. RBAC, audit logs, secrets management, encryption, and compliance-ready infrastructure.",
};

export default function SecurityPage() {
  return <SecurityContent />;
}
