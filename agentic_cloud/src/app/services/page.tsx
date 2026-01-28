import { Metadata } from "next";
import { ServicesContent } from "./ServicesContent";

export const metadata: Metadata = {
  title: "Services - Complete Cloud Service Catalog",
  description:
    "Explore the full range of cloud services available on Agentic Cloud. From compute and databases to CDN and security — everything you need to build.",
};

export default function ServicesPage() {
  return <ServicesContent />;
}
