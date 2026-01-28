import { Metadata } from "next";
import { ProductContent } from "./ProductContent";

export const metadata: Metadata = {
  title: "Product - How Agentic Cloud Works",
  description:
    "Learn how Agentic Cloud uses AI to provision cloud infrastructure from natural language prompts. See example prompts and architecture generation.",
};

export default function ProductPage() {
  return <ProductContent />;
}
