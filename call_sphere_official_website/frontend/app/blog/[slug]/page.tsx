import { Metadata } from "next";
import type { Route } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";
import {
  BreadcrumbJsonLd,
  ArticleJsonLd,
  FAQPageJsonLd,
} from "@/components/StructuredData";
import { ReadingProgressBar } from "@/components/ReadingProgressBar";
import { TableOfContents } from "@/components/TableOfContents";
import { AuthorBox } from "@/components/AuthorBox";
import { ShareButtons } from "@/components/ShareButtons";
import prisma from "@/lib/prisma";
import {
  addHeadingIds,
  extractHeadings,
  extractFAQs,
  categoryNameToSlug,
} from "@/lib/blog-utils";

export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "published" },
    select: { slug: true },
  });
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.slug },
    select: {
      title: true,
      description: true,
      slug: true,
      publishedAt: true,
      updatedAt: true,
      tags: true,
    },
  });

  if (!post) return {};

  return {
    title: `${post.title} | CallSphere Blog`,
    description: post.description,
    alternates: {
      canonical: `https://callsphere.tech/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://callsphere.tech/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.slug, status: "published" },
    include: { author: { select: { name: true } } },
  });

  if (!post) notFound();

  // Process content for TOC and FAQ
  const processedContent = addHeadingIds(post.content);
  const headings = extractHeadings(processedContent);
  const faqs = extractFAQs(processedContent);

  const categorySlug = categoryNameToSlug(post.category);

  // Related posts: same category first, then backfill
  const sameCategoryPosts = await prisma.blogPost.findMany({
    where: {
      status: "published",
      slug: { not: post.slug },
      category: post.category,
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: { slug: true, title: true, description: true, category: true },
  });

  let relatedPosts = sameCategoryPosts;
  if (relatedPosts.length < 3) {
    const backfill = await prisma.blogPost.findMany({
      where: {
        status: "published",
        slug: {
          notIn: [post.slug, ...relatedPosts.map((p) => p.slug)],
        },
      },
      orderBy: { publishedAt: "desc" },
      take: 3 - relatedPosts.length,
      select: { slug: true, title: true, description: true, category: true },
    });
    relatedPosts = [...relatedPosts, ...backfill];
  }

  // Prev / next posts
  const allSlugs = await prisma.blogPost.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "asc" },
    select: { slug: true, title: true },
  });
  const currentIndex = allSlugs.findIndex((p) => p.slug === post.slug);
  const prevPost = currentIndex > 0 ? allSlugs[currentIndex - 1] : null;
  const nextPost =
    currentIndex < allSlugs.length - 1 ? allSlugs[currentIndex + 1] : null;

  const publishedDate = post.publishedAt || post.createdAt;
  const baseUrl = "https://callsphere.tech";

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Blog", url: `${baseUrl}/blog` },
          {
            name: post.category,
            url: `${baseUrl}/blog/category/${categorySlug}`,
          },
          { name: post.title, url: `${baseUrl}/blog/${post.slug}` },
        ]}
      />
      <ArticleJsonLd
        title={post.title}
        description={post.description}
        url={`${baseUrl}/blog/${post.slug}`}
        datePublished={publishedDate.toISOString()}
        dateModified={post.updatedAt.toISOString()}
        authorName={post.author?.name}
      />
      {faqs.length > 0 && <FAQPageJsonLd items={faqs} />}
      <ReadingProgressBar />
      <Nav />
      <main id="main" className="relative">
        <article className="section-shell pt-16 pb-20">
          <div className="mx-auto max-w-5xl">
            {/* Back link */}
            <Link
              href={"/blog" as Route}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>

            {/* Header */}
            <header className="mt-8 max-w-3xl">
              <div className="flex items-center gap-3">
                <Link
                  href={`/blog/category/${categorySlug}` as Route}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  {post.category}
                </Link>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  {post.readTime}
                </span>
                <time
                  dateTime={publishedDate.toISOString()}
                  className="text-xs text-slate-500"
                >
                  {publishedDate.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "America/New_York",
                  })}{" "}
                  at{" "}
                  {publishedDate.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: "America/New_York",
                  })}{" "}
                  EST
                </time>
              </div>
              <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                {post.title}
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                {post.description}
              </p>
            </header>

            {/* Cover Image */}
            {post.coverImage && (
              <div className="relative mt-10 max-w-3xl aspect-[2/1] rounded-xl overflow-hidden">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Content + TOC two-column layout */}
            <div className="mt-12 lg:grid lg:grid-cols-[1fr_220px] lg:gap-10">
              {/* Content */}
              <div
                className="border-t border-slate-200 pt-10 prose prose-slate max-w-none prose-headings:scroll-mt-20 prose-a:text-indigo-600 hover:prose-a:text-indigo-700 prose-img:rounded-xl"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />

              {/* TOC Sidebar */}
              <TableOfContents headings={headings} />
            </div>

            {/* Share Buttons */}
            <ShareButtons
              title={post.title}
              url={`${baseUrl}/blog/${post.slug}`}
              description={post.description}
              coverImage={post.coverImage}
            />

            {/* Author Box */}
            <div className="max-w-3xl">
              <AuthorBox name={post.author?.name} />
            </div>

            {/* CTA Box */}
            <div className="mt-16 max-w-3xl rounded-2xl border border-indigo-200 bg-indigo-50 p-8 text-center">
              <h3 className="text-xl font-bold text-slate-900">
                Try CallSphere AI Voice Agents
              </h3>
              <p className="mt-3 text-slate-600">
                See how AI voice agents work for your industry. Live demo
                available -- no signup required.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Book a Demo
                  <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/industries"
                  className="inline-flex items-center rounded-lg border border-indigo-300 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                  Try Live Demo
                </Link>
              </div>
            </div>

            {/* Prev / Next navigation */}
            {(prevPost || nextPost) && (
              <nav className="mt-12 max-w-3xl grid grid-cols-2 gap-4">
                {prevPost ? (
                  <Link
                    href={`/blog/${prevPost.slug}` as Route}
                    className="group flex flex-col rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300"
                  >
                    <span className="text-xs text-slate-500">
                      Previous
                    </span>
                    <span className="mt-1 text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {prevPost.title}
                    </span>
                  </Link>
                ) : (
                  <div />
                )}
                {nextPost ? (
                  <Link
                    href={`/blog/${nextPost.slug}` as Route}
                    className="group flex flex-col items-end rounded-xl border border-slate-200 p-4 text-right transition-colors hover:border-slate-300"
                  >
                    <span className="text-xs text-slate-500">Next</span>
                    <span className="mt-1 text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {nextPost.title}
                    </span>
                  </Link>
                ) : (
                  <div />
                )}
              </nav>
            )}
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="section-stack bg-slate-50 py-20">
            <div className="mx-auto max-w-6xl px-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Related Articles
              </h2>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/blog/${related.slug}` as Route}
                    className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-lg"
                  >
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                      {related.category}
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {related.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                      {related.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
      <VoiceAgentLauncher />
    </>
  );
}
