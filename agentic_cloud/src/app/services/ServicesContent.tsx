"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { serviceCategories, getServicesByCategory } from "@/lib/services-data";

function getIcon(iconName: string): LucideIcon {
  const icon = Icons[iconName as keyof typeof Icons];
  if (typeof icon === "function") {
    return icon as LucideIcon;
  }
  return Icons.Box;
}

export function ServicesContent() {
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
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Service Catalog
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              Everything You Need
              <br />
              <span className="gradient-text">In One Platform</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto"
            >
              A complete suite of cloud services designed for modern
              applications. Provision any service with a simple prompt.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Quick nav */}
      <section className="py-8 border-y bg-gray-50/50 sticky top-16 lg:top-20 z-30 backdrop-blur-xl">
        <div className="container-custom">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {serviceCategories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-full whitespace-nowrap transition-colors"
              >
                {category.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Services by Category */}
      <section className="py-16 lg:py-24">
        <div className="container-custom">
          <div className="space-y-20">
            {serviceCategories.map((category) => {
              const categoryServices = getServicesByCategory(category.id);
              const CategoryIcon = getIcon(category.icon);

              return (
                <motion.div
                  key={category.id}
                  id={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="scroll-mt-32"
                >
                  {/* Category Header */}
                  <div className="flex items-start gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <CategoryIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
                        {category.name}
                      </h2>
                      <p className="text-gray-600 mt-1">{category.description}</p>
                    </div>
                  </div>

                  {/* Services Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryServices.map((service, index) => {
                      const ServiceIcon = getIcon(service.icon);

                      return (
                        <motion.div
                          key={service.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.05 }}
                          className="glass-card-strong rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                              <ServiceIcon className="w-5 h-5 text-violet-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {service.name}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3">
                                {service.description}
                              </p>

                              {/* Features */}
                              {service.features && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {service.features.map((feature) => (
                                    <span
                                      key={feature}
                                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                                    >
                                      {feature}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Example prompts */}
                              <div className="border-t pt-3 mt-3">
                                <p className="text-xs text-gray-500 mb-2">
                                  Example prompts:
                                </p>
                                {service.examples.map((example, i) => (
                                  <p
                                    key={i}
                                    className="text-xs text-violet-600 font-mono mb-1"
                                  >
                                    "{example}"
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6"
            >
              Ready to Start Building?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-600 mb-8"
            >
              Join the waitlist and get access to all services with a single
              prompt.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Link href="/waitlist">
                <Button size="xl" className="rounded-full">
                  Join Waitlist
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
