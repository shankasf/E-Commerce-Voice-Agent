import { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "AI Voice Agent ROI Calculator | CallSphere",
  description:
    "Calculate your return on investment with CallSphere AI voice agents. See projected savings on staffing, missed calls, and after-hours coverage in seconds.",
  alternates: {
    canonical: "https://callsphere.tech/tools/roi-calculator",
  },
  openGraph: {
    title: "AI Voice Agent ROI Calculator | CallSphere",
    description:
      "Calculate your return on investment with CallSphere AI voice agents. See projected savings on staffing, missed calls, and after-hours coverage.",
    url: "https://callsphere.tech/tools/roi-calculator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Voice Agent ROI Calculator | CallSphere",
    description:
      "Calculate your return on investment with CallSphere AI voice agents. See projected savings in seconds.",
  },
};

export default function ROICalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://callsphere.tech" },
          { name: "Tools", url: "https://callsphere.tech/tools" },
          { name: "ROI Calculator", url: "https://callsphere.tech/tools/roi-calculator" },
        ]}
      />
      {children}
    </>
  );
}
