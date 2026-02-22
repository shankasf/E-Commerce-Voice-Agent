import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";
import {
  BreadcrumbJsonLd,
  CollectionPageJsonLd,
} from "@/components/StructuredData";
import { BlogPostGrid } from "@/components/BlogPostGrid";
import prisma from "@/lib/prisma";
import {
  CATEGORY_MAP,
  categorySlugToName,
} from "@/lib/blog-utils";

export const revalidate = 60;

export function generateStaticParams() {
  return Object.keys(CATEGORY_MAP).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const cat = CATEGORY_MAP[params.slug];
  if (!cat) return {};

  const url = `https://callsphere.tech/blog/category/${params.slug}`;
  return {
    title: cat.title,
    description: cat.description,
    alternates: { canonical: url },
    openGraph: {
      title: cat.title,
      description: cat.description,
      url,
      type: "website",
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const cat = CATEGORY_MAP[params.slug];
  if (!cat) notFound();

  const categoryName = categorySlugToName(params.slug);

  const posts = await prisma.blogPost.findMany({
    where: {
      status: "published",
      category: { equals: categoryName, mode: "insensitive" },
    },
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

  const baseUrl = "https://callsphere.tech";

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Blog", url: `${baseUrl}/blog` },
          { name: cat.name, url: `${baseUrl}/blog/category/${params.slug}` },
        ]}
      />
      <CollectionPageJsonLd
        name={cat.title}
        description={cat.description}
        url={`${baseUrl}/blog/category/${params.slug}`}
        items={posts.map((p, i) => ({
          position: i + 1,
          url: `${baseUrl}/blog/${p.slug}`,
          name: p.title,
        }))}
      />
      <Nav />
      <main id="main" className="relative">
        <section className="section-shell pt-16 pb-12">
          <div className="mx-auto max-w-4xl">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              All Posts
            </Link>
            <div className="mt-6 text-center">
              <span className="rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
                {cat.name}
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                {cat.title.replace(" | CallSphere Blog", "")}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
                {cat.description}
              </p>
            </div>
          </div>
        </section>

        <section className="section-stack pb-20">
          <div className="mx-auto max-w-6xl px-6">
            {posts.length > 0 ? (
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
            ) : (
              <p className="py-16 text-center text-slate-500">
                No posts in this category yet. Check back soon!
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <VoiceAgentLauncher />
    </>
  );
}
