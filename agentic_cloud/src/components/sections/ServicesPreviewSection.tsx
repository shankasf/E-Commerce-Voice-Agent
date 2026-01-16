"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { serviceCategories } from "@/lib/services-data";

function getIcon(iconName: string): LucideIcon {
  const icon = Icons[iconName as keyof typeof Icons];
  if (typeof icon === "function") {
    return icon as LucideIcon;
  }
  return Icons.Box;
}

export function ServicesPreviewSection() {
  return (
    <section className="py-20 lg:py-32">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
          >
            Everything You Need to Ship
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600"
          >
            A complete cloud platform with all the services required for
            modern applications
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
          {serviceCategories.map((category, index) => {
            const IconComponent = getIcon(category.icon);

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/services#${category.id}`}
                  className="group block glass-card rounded-xl p-5 h-full transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:bg-white"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-3 group-hover:from-violet-500 group-hover:to-indigo-500 transition-all duration-300">
                    <IconComponent className="w-5 h-5 text-violet-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm lg:text-base">
                    {category.name}
                  </h3>
                  <p className="text-xs lg:text-sm text-gray-500 line-clamp-2">
                    {category.description}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center">
          <Link href="/services">
            <Button size="lg" variant="outline" className="rounded-full">
              Explore All Services
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
