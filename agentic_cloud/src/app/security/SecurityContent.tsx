"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Shield,
  Lock,
  Key,
  Users,
  FileText,
  Eye,
  Server,
  Globe,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const securityFeatures = [
  {
    icon: Lock,
    title: "Encryption Everywhere",
    description:
      "All data is encrypted at rest (AES-256) and in transit (TLS 1.3). No exceptions.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Users,
    title: "RBAC & IAM",
    description:
      "Fine-grained role-based access control. Define who can access what, down to individual resources.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Key,
    title: "Secrets Management",
    description:
      "Secure vault for API keys, credentials, and sensitive config. Automatic rotation supported.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: FileText,
    title: "Audit Logs",
    description:
      "Complete audit trail of all actions. Know who did what, when, and from where.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Eye,
    title: "Monitoring & Alerting",
    description:
      "Real-time security monitoring. Get alerted on suspicious activity immediately.",
    color: "from-red-500 to-rose-500",
  },
  {
    icon: Shield,
    title: "WAF & DDoS Protection",
    description:
      "Web application firewall and DDoS mitigation included. OWASP top 10 rules built-in.",
    color: "from-pink-500 to-fuchsia-500",
  },
];

const complianceItems = [
  {
    name: "SOC 2 Type II",
    status: "In Progress",
    description: "Pursuing certification for enterprise customers",
  },
  {
    name: "GDPR",
    status: "Compliant",
    description: "Data processing agreements and privacy controls available",
  },
  {
    name: "HIPAA",
    status: "Planned",
    description: "Healthcare data protection on our roadmap",
  },
  {
    name: "PCI DSS",
    status: "Planned",
    description: "Payment card industry compliance for fintech",
  },
];

const securityPractices = [
  "Regular third-party penetration testing",
  "Vulnerability scanning and remediation",
  "Security-focused code reviews",
  "Employee security training",
  "Incident response procedures",
  "Data backup and disaster recovery",
  "Network segmentation and isolation",
  "Multi-factor authentication support",
];

export function SecurityContent() {
  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Badge variant="gradient" className="mb-6">
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Security
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              Security Built In,
              <br />
              <span className="gradient-text">Not Bolted On</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Every deployment on Agentic Cloud includes enterprise-grade
              security by default. No extra configuration required.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
            >
              Security Features
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-600"
            >
              Comprehensive protection for your infrastructure and data
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card-strong rounded-2xl p-6"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
              >
                Compliance Ready
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-lg text-gray-600 mb-8"
              >
                We're building Agentic Cloud with compliance in mind from day
                one. Our infrastructure and processes are designed to meet
                enterprise requirements.
              </motion.p>

              <div className="space-y-4">
                {complianceItems.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-card rounded-xl p-4 flex items-start gap-4"
                  >
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === "Compliant"
                          ? "bg-green-100 text-green-700"
                          : item.status === "In Progress"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.status}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {item.name}
                      </h4>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="glass-card-strong rounded-2xl p-8"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Security Practices
              </h3>
              <ul className="space-y-3">
                {securityPractices.map((practice, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{practice}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-16 lg:py-24 bg-gray-900 text-white">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-bold mb-4"
            >
              Infrastructure Security
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-400"
            >
              Multi-layered protection at every level of the stack
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
            >
              <Server className="w-10 h-10 text-violet-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Physical Security</h3>
              <p className="text-gray-400 text-sm">
                Tier-4 data centers with 24/7 monitoring, biometric access, and
                environmental controls.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
            >
              <Globe className="w-10 h-10 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Network Security</h3>
              <p className="text-gray-400 text-sm">
                Private networks, DDoS protection, and intrusion detection at
                the edge.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
            >
              <AlertTriangle className="w-10 h-10 text-yellow-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Incident Response</h3>
              <p className="text-gray-400 text-sm">
                Dedicated security team with documented incident response and
                communication procedures.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6"
            >
              Have Security Questions?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-600 mb-8"
            >
              Our security team is happy to discuss your specific requirements.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/company#contact">
                <Button size="lg" variant="outline" className="rounded-full">
                  Contact Security Team
                </Button>
              </Link>
              <Link href="/waitlist">
                <Button size="lg" className="rounded-full">
                  Join Waitlist
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
