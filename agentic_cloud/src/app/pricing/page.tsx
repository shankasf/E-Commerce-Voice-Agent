import { Metadata } from "next";
import { PricingContent } from "./PricingContent";

export const metadata: Metadata = {
  title: "Pricing - Transparent Cloud Costs",
  description:
    "Agentic Cloud pricing is simple and transparent. Pay only for what you use with no hidden fees. Try our cost estimator to see rough estimates for your workloads.",
};

export default function PricingPage() {
  return <PricingContent />;
}
