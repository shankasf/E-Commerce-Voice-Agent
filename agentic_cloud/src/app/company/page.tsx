import { Metadata } from "next";
import { CompanyContent } from "./CompanyContent";

export const metadata: Metadata = {
  title: "Company - About CallSphere",
  description:
    "Learn about CallSphere and our mission to make cloud infrastructure accessible through natural language.",
};

export default function CompanyPage() {
  return <CompanyContent />;
}
