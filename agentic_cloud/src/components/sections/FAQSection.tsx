"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does natural language provisioning work?",
    answer:
      "You describe your infrastructure needs in plain English — like 'I need a scalable web app with a database and caching.' Our AI analyzes your prompt, identifies the required components, and generates an optimized architecture using best practices. You review the plan and deploy with one click.",
  },
  {
    question: "Is Agentic Cloud a replacement for AWS/Azure/GCP?",
    answer:
      "Agentic Cloud is designed to be a simpler, more accessible alternative for most use cases. Under the hood, we leverage enterprise-grade infrastructure. For teams that need the full power of traditional cloud providers, we also support hybrid deployments.",
  },
  {
    question: "How accurate are the cost estimates?",
    answer:
      "Our estimates are based on market benchmarks and typical usage patterns. They're directional — designed to help you plan and budget. Actual costs depend on your specific usage. We provide detailed billing breakdowns and cost alerts to avoid surprises.",
  },
  {
    question: "Can I customize the generated architecture?",
    answer:
      "Absolutely. After the AI generates a plan, you can modify any component — change instance sizes, add services, adjust scaling rules, or override defaults. You always have full control over the final deployment.",
  },
  {
    question: "What about security and compliance?",
    answer:
      "Security is built-in from day one. Every deployment includes encrypted connections, secrets management, and access controls. We're working toward SOC 2 Type II compliance and support enterprise requirements like SSO, audit logs, and data residency options.",
  },
  {
    question: "How do I get started?",
    answer:
      "Join our waitlist to get early access. Once approved, you'll receive an invite with your API key. You can start deploying immediately using our CLI, SDK, or web console. Our team is available to help with onboarding.",
  },
];

export function FAQSection() {
  return (
    <section className="py-20 lg:py-32">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
            >
              Frequently Asked Questions
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border-b border-gray-200"
                >
                  <AccordionTrigger className="text-left text-gray-900 hover:text-violet-600 py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
