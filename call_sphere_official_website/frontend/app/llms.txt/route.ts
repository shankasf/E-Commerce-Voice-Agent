import prisma from "@/lib/prisma";

export const revalidate = 3600;

export async function GET() {
  const baseUrl = "https://callsphere.tech";

  const posts = await prisma.blogPost.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    select: {
      slug: true,
      title: true,
      description: true,
      category: true,
      tags: true,
      publishedAt: true,
    },
  });

  const blogSection = posts
    .map(
      (p) =>
        `- [${p.title}](${baseUrl}/blog/${p.slug}): ${p.description} [${p.category}] [${p.tags.join(", ")}]`
    )
    .join("\n");

  const text = `# CallSphere

> AI-powered voice and chat agent platform for enterprise customer communications.

CallSphere deploys autonomous AI agents that answer phone calls, conduct natural-language conversations, execute multi-step workflows (scheduling, ordering, payments, support), and escalate to humans when needed. Agents operate 24/7 across 57 languages with sub-1.5-second voice latency.

## Company Info
- Website: ${baseUrl}
- Contact: sagar@callsphere.tech | +1-845-388-4261
- Location: 27 Orchard Pl, New York, NY

## Key Capabilities
- AI voice agents (inbound/outbound) via SIP, WebRTC, PSTN
- AI chat agents for web, SMS, WhatsApp
- Tool calling: agents invoke external APIs (CRM, calendar, payments) mid-conversation
- RAG with uploaded knowledge bases
- Real-time analytics: sentiment, resolution rate, CSAT, topic modeling
- Human handoff with full conversation context
- PII redaction, guardrails, topic deny-lists, audit logging
- HIPAA, PCI-DSS, GDPR compliance
- 57+ languages with accent-aware ASR

## Pricing
- Starter: $149/mo — 1 voice + 1 chat agent, 500 min
- Growth: $499/mo — 3 voice + 3 chat agents, 2,000 min, advanced analytics
- Scale: $1,499/mo — Unlimited agents & minutes, dedicated support, SLA, SSO

## Industries
- HVAC & Home Services
- Healthcare (HIPAA-compliant)
- IT Support & MSPs
- Logistics & Supply Chain
- Restaurants & Food Service
- Professional Services

## Pages
- Home: ${baseUrl}
- Features: ${baseUrl}/features
- Pricing: ${baseUrl}/pricing
- How It Works: ${baseUrl}/how-it-works
- Platform Architecture: ${baseUrl}/platform
- Industries: ${baseUrl}/industries
- Live Demo: ${baseUrl}/demo
- Blog: ${baseUrl}/blog
- FAQ: ${baseUrl}/faq
- Glossary: ${baseUrl}/glossary
- Compare: ${baseUrl}/compare
- Solutions: ${baseUrl}/solutions
- Contact: ${baseUrl}/contact

## Integrations
- CRM: Salesforce, HubSpot, Zendesk, Freshdesk
- Payments: Stripe, Square
- E-Commerce: Shopify, WooCommerce
- Telephony: Twilio (BYOD supported)
- Field Service: ServiceTitan, ConnectWise
- Custom: REST API, webhooks (HMAC-SHA256 signed)

## Blog Posts (${posts.length} articles)
${blogSection}

## Feeds & Machine-Readable Content
- Sitemap: ${baseUrl}/sitemap.xml
- RSS Feed: ${baseUrl}/blog/feed.xml
- Full Content (plain text): ${baseUrl}/llms-full.txt
`;

  // Delete the static file to avoid conflicts
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
