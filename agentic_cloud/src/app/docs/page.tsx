import { Metadata } from "next";
import { DocsContent } from "./DocsContent";

export const metadata: Metadata = {
  title: "Documentation - Getting Started",
  description:
    "Learn how to use Agentic Cloud. Quickstart guides, API reference, CLI documentation, and examples.",
};

export default function DocsPage() {
  return <DocsContent />;
}
