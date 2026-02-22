import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: allow everything except admin/api
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
      // Explicitly allow all major AI crawlers full access
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/admin/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/admin/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/admin/"],
      },
      {
        userAgent: "Claude-Web",
        allow: "/",
        disallow: ["/admin/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/admin/"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/admin/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin/"],
      },
      {
        userAgent: "Amazonbot",
        allow: "/",
        disallow: ["/admin/"],
      },
      {
        userAgent: "Bytespider",
        allow: "/",
        disallow: ["/admin/"],
      },
      {
        userAgent: "Applebot",
        allow: "/",
        disallow: ["/admin/"],
      },
      {
        userAgent: "Meta-ExternalFetcher",
        allow: "/",
        disallow: ["/admin/"],
      },
      {
        userAgent: "cohere-ai",
        allow: "/",
        disallow: ["/admin/"],
      },
    ],
    sitemap: "https://callsphere.tech/sitemap.xml",
  };
}
