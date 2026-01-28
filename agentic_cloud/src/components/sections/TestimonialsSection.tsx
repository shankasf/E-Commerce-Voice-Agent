"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    id: "1",
    content:
      "We went from zero to production in under an hour. What used to take our infra team weeks now happens with a single prompt.",
    name: "Sarah Chen",
    role: "CTO",
    company: "TechFlow",
  },
  {
    id: "2",
    content:
      "The AI understands exactly what we need. It suggested a better architecture than what I had planned, and costs are 40% lower.",
    name: "Marcus Johnson",
    role: "Lead Engineer",
    company: "ScaleUp Labs",
  },
  {
    id: "3",
    content:
      "Finally, a cloud platform that doesn't require reading 500 pages of documentation. My team is shipping faster than ever.",
    name: "Emily Rodriguez",
    role: "Founder",
    company: "BuildFast",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-violet-50 to-white">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-violet-600 font-medium mb-4"
          >
            Trusted by Builders
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
          >
            What Developers Are Saying
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card-strong rounded-2xl p-6 lg:p-8"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-700 leading-relaxed mb-6">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                  {testimonial.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
