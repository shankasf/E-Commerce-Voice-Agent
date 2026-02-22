import { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { CATEGORY_MAP } from "@/lib/blog-utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://callsphere.tech";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/industries`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/integrations`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/solutions`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/affiliate`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tools/roi-calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/security`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/data-rights`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/subprocessors`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/platform`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/glossary`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Industry pages
  const industrySlugs = [
    "hvac",
    "healthcare",
    "it-support",
    "logistics",
    "real-estate",
    "restaurant",
    "salon-beauty",
    "dental",
    "legal",
    "insurance",
    "automotive",
    "financial-services",
  ];
  const industryPages: MetadataRoute.Sitemap = industrySlugs.map((slug) => ({
    url: `${baseUrl}/industries/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Integration pages
  const integrationSlugs = [
    "twilio",
    "salesforce",
    "hubspot",
    "zendesk",
    "stripe",
    "shopify",
    "servicetitan",
    "connectwise",
    "freshdesk",
    "google-calendar",
    "calendly",
    "square",
    "zoho-crm",
    "pipedrive",
    "monday",
  ];
  const integrationPages: MetadataRoute.Sitemap = integrationSlugs.map(
    (slug) => ({
      url: `${baseUrl}/integrations/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    })
  );

  // Comparison pages
  const compareSlugs = [
    "callsphere-vs-bland-ai",
    "callsphere-vs-vapi",
    "callsphere-vs-synthflow",
    "callsphere-vs-retell-ai",
    "callsphere-vs-polyai",
    "callsphere-vs-smith-ai",
    "callsphere-vs-goodcall",
    "callsphere-vs-dialzara",
    "callsphere-vs-voiceflow",
    "callsphere-vs-my-ai-front-desk",
    "callsphere-vs-lindy-ai",
    "ai-voice-agent-vs-ivr-chatbot",
  ];
  const comparePages: MetadataRoute.Sitemap = compareSlugs.map((slug) => ({
    url: `${baseUrl}/compare/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // Solutions pages
  const solutionSlugs = [
    "appointment-scheduling",
    "order-processing",
    "payment-collection",
    "customer-support",
    "after-hours-answering",
    "lead-qualification",
    "emergency-dispatch",
    "patient-intake",
    "order-tracking",
    "debt-collection",
  ];
  const solutionPages: MetadataRoute.Sitemap = solutionSlugs.map((slug) => ({
    url: `${baseUrl}/solutions/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // Blog posts from Prisma
  const posts = await prisma.blogPost.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true },
  });
  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Blog category pages
  const categoryPages: MetadataRoute.Sitemap = Object.keys(CATEGORY_MAP).map(
    (slug) => ({
      url: `${baseUrl}/blog/category/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    })
  );

  return [
    ...staticPages,
    ...industryPages,
    ...integrationPages,
    ...comparePages,
    ...solutionPages,
    ...blogPages,
    ...categoryPages,
  ];
}
