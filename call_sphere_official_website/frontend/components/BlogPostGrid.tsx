"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { ArrowRight, Clock } from "lucide-react";

type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  readTime: string;
  tags: string[];
  coverImage?: string;
};

export function BlogPostGrid({ posts }: { posts: BlogPost[] }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const allCategories = Array.from(
    new Set(posts.map((p) => p.category))
  ).sort();

  const filteredPosts = activeCategory
    ? posts.filter((p) => p.category === activeCategory)
    : posts;

  return (
    <>
      {/* Category filter */}
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            !activeCategory
              ? "bg-indigo-600 text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          All
        </button>
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              setActiveCategory(activeCategory === cat ? null : cat)
            }
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts list */}
      <div className="flex flex-col gap-6">
        {filteredPosts.map((post) => (
          <article
            key={post.slug}
            className="group flex flex-col sm:flex-row gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-lg"
          >
            {post.coverImage && (
              <Link
                href={`/blog/${post.slug}` as Route}
                className="shrink-0"
              >
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  width={224}
                  height={160}
                  className="w-full sm:w-56 h-40 rounded-xl object-cover"
                />
              </Link>
            )}
            <div className="flex flex-1 flex-col">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() =>
                    setActiveCategory(
                      activeCategory === post.category ? null : post.category
                    )
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeCategory === post.category
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  {post.category}
                </button>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  {post.readTime}
                </span>
                <time
                  dateTime={post.date}
                  className="text-xs text-slate-500"
                >
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "America/New_York",
                  })}{" "}
                  at{" "}
                  {new Date(post.date).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: "America/New_York",
                  })}{" "}
                  EST
                </time>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                <Link href={`/blog/${post.slug}` as Route}>{post.title}</Link>
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {post.description}
              </p>
              <div className="mt-4 flex items-center justify-end">
                <Link
                  href={`/blog/${post.slug}` as Route}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Read Article
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <p className="text-center text-slate-500 py-12">
          No posts found for this category.{" "}
          <button
            onClick={() => setActiveCategory(null)}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Show all
          </button>
        </p>
      )}
    </>
  );
}
