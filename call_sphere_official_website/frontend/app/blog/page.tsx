import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";
import { BreadcrumbJsonLd } from "@/components/StructuredData";
import { BlogPostGrid } from "@/components/BlogPostGrid";
import { NewsletterSubscribe } from "@/components/NewsletterSubscribe";
import prisma from "@/lib/prisma";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog - AI Voice Agent Insights & Guides | CallSphere",
  description:
    "Expert guides on AI voice agents, contact center automation, and conversational AI. Learn how to reduce costs, improve customer experience, and scale with AI.",
  alternates: {
    canonical: "https://callsphere.tech/blog",
    types: {
      "application/rss+xml": "https://callsphere.tech/blog/feed.xml",
    },
  },
  openGraph: {
    title: "Blog - AI Voice Agent Insights & Guides | CallSphere",
    description:
      "Expert guides on AI voice agents, contact center automation, and conversational AI.",
    url: "https://callsphere.tech/blog",
    type: "website",
  },
};

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    select: {
      slug: true,
      title: true,
      description: true,
      publishedAt: true,
      category: true,
      readTime: true,
      tags: true,
      coverImage: true,
    },
  });

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://callsphere.tech" },
          { name: "Blog", url: "https://callsphere.tech/blog" },
        ]}
      />
      <Nav />
      <main id="main" className="relative">
        {/* Hero */}
        <section className="section-shell pt-16 pb-12">
          <div className="mx-auto max-w-4xl text-center">
            <span className="text-sm font-medium text-indigo-600">Blog</span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              AI Voice Agent Insights & Guides
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Expert guides on AI voice agents, conversational AI, and contact
              center automation. Learn how to reduce costs and improve customer
              experience.
            </p>
          </div>
        </section>

        {/* Posts Grid */}
        <section className="section-stack pb-20">
          <div className="mx-auto max-w-6xl px-6">
            <BlogPostGrid
              posts={posts.map((p) => ({
                slug: p.slug,
                title: p.title,
                description: p.description,
                date: (p.publishedAt || new Date()).toISOString(),
                category: p.category,
                readTime: p.readTime,
                tags: p.tags,
                coverImage: p.coverImage || undefined,
              }))}
            />
          </div>
        </section>

        {/* Newsletter Subscribe */}
        <section className="section-stack pb-12">
          <div className="mx-auto max-w-2xl px-6">
            <NewsletterSubscribe />
          </div>
        </section>

        {/* CTA */}
        <section className="section-stack pb-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white px-8 py-16 text-center sm:px-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Ready to see AI voice agents in action?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                Try our live demo -- no signup required. Talk to an AI voice
                agent right now.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Book a Demo
                  <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/industries"
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Try Live Demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <VoiceAgentLauncher />
    </>
  );
}
