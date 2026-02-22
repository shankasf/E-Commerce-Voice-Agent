/**
 * Supplementary SEO Blog Seed — adds ~80 more posts to reach 500+ total.
 *
 * Usage:  npx tsx prisma/seed-seo-extra.ts
 */

import { PrismaClient } from "@prisma/client";
import { marked } from "marked";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type PostSeed = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  readTime: string;
  tags: string[];
  content: string;
};

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const INDUSTRIES = [
  { name: "Healthcare", slug: "healthcare", tools: "Epic, Cerner, athenahealth", compliance: "HIPAA-compliant", pain: "patient no-shows and after-hours calls" },
  { name: "Dental", slug: "dental", tools: "Dentrix, Eaglesoft", compliance: "HIPAA-compliant", pain: "recall appointment gaps and insurance verification delays" },
  { name: "HVAC", slug: "hvac", tools: "ServiceTitan, Housecall Pro", compliance: "SOC 2 aligned", pain: "missed emergency calls and seasonal spikes" },
  { name: "Real Estate", slug: "real-estate", tools: "AppFolio, Buildium, Yardi", compliance: "SOC 2 aligned", pain: "lost prospect calls and showing coordination" },
  { name: "Restaurant", slug: "restaurant", tools: "OpenTable, Toast, Square", compliance: "PCI-compliant", pain: "missed calls during rush and order errors" },
  { name: "Salon & Beauty", slug: "salon-beauty", tools: "Vagaro, Fresha, Mindbody", compliance: "SOC 2 aligned", pain: "stylist interruptions and no-shows" },
  { name: "Legal", slug: "legal", tools: "Clio, MyCase", compliance: "SOC 2 aligned", pain: "high-value leads lost to voicemail" },
  { name: "Insurance", slug: "insurance", tools: "Applied Epic, Hawksoft", compliance: "SOC 2 aligned", pain: "quote response delays and claims intake bottlenecks" },
  { name: "Automotive", slug: "automotive", tools: "CDK Global, DealerSocket", compliance: "SOC 2 aligned", pain: "sales leads lost and service department overload" },
  { name: "Financial Services", slug: "financial-services", tools: "Salesforce Financial Cloud, Redtail", compliance: "SOC 2 aligned with GDPR", pain: "routine inquiry overload" },
  { name: "IT Support", slug: "it-support", tools: "ConnectWise, Autotask, Zendesk", compliance: "SOC 2 aligned", pain: "Tier-1 ticket overload and slow SLA response" },
  { name: "Logistics", slug: "logistics", tools: "ShipStation, ShipBob", compliance: "SOC 2 aligned", pain: "WISMO calls and delivery exceptions" },
  { name: "E-commerce", slug: "ecommerce", tools: "Shopify, WooCommerce, BigCommerce", compliance: "PCI-compliant", pain: "order status inquiries and return processing" },
  { name: "Education", slug: "education", tools: "Ellucian, Salesforce Education Cloud", compliance: "FERPA-compatible", pain: "enrollment inquiry overload" },
  { name: "Hospitality", slug: "hospitality", tools: "Opera PMS, Cloudbeds", compliance: "PCI-compliant", pain: "reservation overload and multilingual guests" },
  { name: "Veterinary", slug: "veterinary", tools: "Cornerstone, eVetPractice", compliance: "SOC 2 aligned", pain: "appointment no-shows and emergency triage" },
  { name: "Property Management", slug: "property-management", tools: "AppFolio, Buildium", compliance: "SOC 2 aligned", pain: "maintenance backlogs and tenant communication gaps" },
  { name: "Home Services", slug: "home-services", tools: "ServiceTitan, Housecall Pro", compliance: "SOC 2 aligned", pain: "missed after-hours calls and seasonal demand" },
  { name: "Fitness & Wellness", slug: "fitness", tools: "Mindbody, Glofox", compliance: "SOC 2 aligned", pain: "class booking confusion and membership inquiries" },
  { name: "Plumbing", slug: "plumbing", tools: "ServiceTitan, Jobber", compliance: "SOC 2 aligned", pain: "missed emergency calls and dispatcher overload" },
];

const COMPETITORS = [
  { name: "Bland.ai", slug: "bland-ai" },
  { name: "Vapi", slug: "vapi" },
  { name: "Synthflow", slug: "synthflow" },
  { name: "PolyAI", slug: "polyai" },
  { name: "Smith.ai", slug: "smith-ai" },
  { name: "Goodcall", slug: "goodcall" },
  { name: "Retell AI", slug: "retell-ai" },
  { name: "My AI Front Desk", slug: "my-ai-front-desk" },
  { name: "Dialzara", slug: "dialzara" },
  { name: "Lindy.ai", slug: "lindy-ai" },
  { name: "Voiceflow", slug: "voiceflow" },
  { name: "Phonely", slug: "phonely" },
  { name: "PlayAI", slug: "playai" },
  { name: "Air.ai", slug: "air-ai" },
  { name: "Rosie.ai", slug: "rosie-ai" },
];

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
//  Template: Checklist posts
// ---------------------------------------------------------------------------

function checklistPost(ind: typeof INDUSTRIES[number], i: number): PostSeed {
  const title = `AI Voice Agent Buying Checklist for ${ind.name} (2026)`;
  return {
    slug: slugify(title),
    title,
    description: `A comprehensive checklist for ${ind.name.toLowerCase()} businesses evaluating AI voice agent platforms. Covers features, compliance, integrations, and pricing.`,
    date: dateStr(i * 2 + 1),
    category: "guides",
    readTime: "6 min read",
    tags: ["checklist", ind.slug, "ai-voice-agent", "buying-guide"],
    content: `## AI Voice Agent Checklist for ${ind.name}

Before choosing an AI voice agent platform for your ${ind.name.toLowerCase()} business, evaluate these critical criteria to avoid costly mistakes.

## 1. Core Voice Capabilities

- [ ] Natural language understanding (not keyword-based IVR)
- [ ] Sub-500ms response latency for natural conversations
- [ ] Support for interruptions and mid-sentence corrections
- [ ] Multi-turn conversation memory across the full call
- [ ] Ability to handle ${ind.name.toLowerCase()}-specific terminology

## 2. ${ind.name} Compliance

- [ ] ${ind.compliance} certification or alignment
- [ ] Encrypted call recording and transcript storage
- [ ] Audit logging for all AI decisions and actions
- [ ] Role-based access controls for staff
- [ ] Data retention and deletion policies

## 3. Integration Requirements

- [ ] Native integration with ${ind.tools}
- [ ] Real-time data sync (not batch)
- [ ] Bi-directional updates (reads and writes)
- [ ] Webhook support for custom workflows
- [ ] API access for custom integrations

## 4. Channel Coverage

- [ ] Inbound phone calls
- [ ] Outbound calls (reminders, follow-ups)
- [ ] Web chat widget
- [ ] SMS / text messaging
- [ ] WhatsApp (if serving international customers)

## 5. Intelligence Features

- [ ] Intent classification with confidence scoring
- [ ] Sentiment detection for escalation triggers
- [ ] Smart routing based on urgency and type
- [ ] Conversation analytics and topic modeling
- [ ] Customer satisfaction scoring (CSAT)

## 6. Deployment & Support

- [ ] Time to go live: ideally 3-5 business days
- [ ] Dedicated onboarding support
- [ ] No-code or low-code configuration
- [ ] 99.9% uptime SLA
- [ ] Phone/email/chat support for your team

## 7. Pricing Transparency

- [ ] Flat monthly pricing (avoid per-minute billing traps)
- [ ] No hidden fees for integrations or languages
- [ ] Free trial or live demo available
- [ ] Scalable plans that grow with your business
- [ ] Annual discount option (15-20% typical)

## Why ${ind.name} Businesses Choose CallSphere

CallSphere checks every box on this checklist for ${ind.name.toLowerCase()} businesses. With ${ind.compliance} deployments, native ${ind.tools} integrations, and flat pricing starting at $149/month, it is the most complete AI voice agent platform for ${ind.name.toLowerCase()}.

[Book a demo](/contact) to see CallSphere configured for your ${ind.name.toLowerCase()} workflows.`,
  };
}

// ---------------------------------------------------------------------------
//  Template: Cost comparison posts
// ---------------------------------------------------------------------------

function costComparisonPost(ind: typeof INDUSTRIES[number], i: number): PostSeed {
  const title = `AI Voice Agent vs Human Receptionist: Cost Analysis for ${ind.name}`;
  return {
    slug: slugify(title),
    title,
    description: `Compare the true cost of AI voice agents vs human receptionists for ${ind.name.toLowerCase()} businesses. Includes salary, benefits, training, and opportunity cost analysis.`,
    date: dateStr(i * 2 + 40),
    category: "business",
    readTime: "7 min read",
    tags: ["cost-analysis", ind.slug, "roi", "ai-voice-agent"],
    content: `## The True Cost of Answering Phones in ${ind.name}

For most ${ind.name.toLowerCase()} businesses, the phone is the primary revenue channel. But staffing it properly is expensive — and understaffing it costs even more in lost opportunities.

## Human Receptionist Costs

A full-time receptionist for a ${ind.name.toLowerCase()} business typically costs:

| Cost Component | Annual Cost |
|---|---|
| Base salary | $32,000 - $45,000 |
| Benefits (health, PTO, etc.) | $8,000 - $15,000 |
| Training & onboarding | $2,000 - $5,000 |
| Turnover replacement (avg 1x/year) | $4,000 - $8,000 |
| Phone system & equipment | $1,200 - $3,000 |
| **Total annual cost** | **$47,200 - $76,000** |

And that is for a single employee covering ~40 hours per week. For 24/7 coverage, you need 4-5 FTEs — pushing annual costs to $190,000 - $380,000.

## What Human Receptionists Cannot Do

Even the best receptionist:
- Cannot answer multiple calls simultaneously
- Needs breaks, sick days, and vacation
- Varies in quality based on mood and energy
- Cannot instantly access all business systems
- Requires continuous training on new procedures

## AI Voice Agent Costs

CallSphere AI voice agent plans for ${ind.name.toLowerCase()} businesses:

| Plan | Monthly Cost | Annual Cost | Interactions |
|---|---|---|---|
| Starter | $149 | $1,788 | 2,000/mo |
| Growth | $499 | $5,988 | 10,000/mo |
| Scale | $1,499 | $17,988 | 50,000/mo |

## What AI Voice Agents Can Do That Humans Cannot

- Handle unlimited simultaneous calls
- Operate 24/7/365 with zero downtime
- Speak 57+ languages naturally
- Instantly access ${ind.tools} in real time
- Maintain perfect consistency on every call
- Process payments securely during calls
- Never call in sick, quit, or need a raise

## ROI Calculation for ${ind.name}

For a typical ${ind.name.toLowerCase()} business handling 3,000 calls per month:

| Metric | Human Staff | CallSphere AI |
|---|---|---|
| Annual cost | $95,000+ | $5,988 |
| Hours of coverage | 40-50/week | 168/week (24/7) |
| Calls missed | 20-30% | 0% |
| Languages supported | 1-2 | 57+ |
| Simultaneous calls | 1 | Unlimited |

**Annual savings: $89,000+ with better coverage.**

The math is clear: AI voice agents deliver more coverage, more consistency, and more revenue at a fraction of the cost of human receptionists — especially for ${ind.name.toLowerCase()} businesses dealing with ${ind.pain}.

[Calculate your exact ROI](/tools/roi-calculator) or [book a demo](/contact) to see CallSphere in action for ${ind.name.toLowerCase()}.`,
  };
}

// ---------------------------------------------------------------------------
//  Template: Migration guide posts
// ---------------------------------------------------------------------------

function migrationPost(comp: typeof COMPETITORS[number], i: number): PostSeed {
  const title = `How to Switch from ${comp.name} to CallSphere: Migration Guide`;
  return {
    slug: slugify(title),
    title,
    description: `Step-by-step guide to migrating from ${comp.name} to CallSphere. Covers data migration, number porting, integration setup, and go-live checklist.`,
    date: dateStr(i * 3 + 80),
    category: "guides",
    readTime: "8 min read",
    tags: ["migration", comp.slug, "callsphere", "switching"],
    content: `## Why Businesses Switch from ${comp.name} to CallSphere

Businesses typically switch from ${comp.name} to CallSphere for three reasons: predictable flat pricing instead of per-minute charges, voice + chat in one unified platform, and faster deployment with no engineering required.

## Migration Timeline

Most ${comp.name} to CallSphere migrations complete in 5-7 business days. Here is the step-by-step process:

### Day 1-2: Discovery & Configuration

1. **Export your data** from ${comp.name} — call logs, contacts, and conversation flows
2. **Configure CallSphere** with your business knowledge base, hours, and workflows
3. **Set up integrations** — connect your CRM, scheduling tool, and payment processor
4. **Define routing rules** — how calls should be handled by type and urgency

### Day 3-4: Testing & Refinement

1. **Internal testing** — your team calls the AI agent to verify responses
2. **Edge case tuning** — adjust for industry-specific scenarios
3. **Integration verification** — confirm data flows correctly to all connected systems
4. **Escalation testing** — verify human handoff works smoothly

### Day 5: Number Porting & Go-Live

1. **Port your phone numbers** from ${comp.name} to CallSphere (we handle the porting process)
2. **Parallel running** — both systems active briefly to ensure zero downtime
3. **Cutover** — ${comp.name} deactivated, CallSphere handling 100% of traffic
4. **Monitoring** — CallSphere team monitors the first 48 hours post-migration

## What You Keep

- All your existing phone numbers (ported seamlessly)
- Call history and analytics (exported from ${comp.name})
- Customer contact data
- Business workflow logic (reconfigured in CallSphere)

## What You Gain

- **Voice + Chat unified** — one platform for phone calls, web chat, SMS, and WhatsApp
- **Flat monthly pricing** — no more per-minute billing surprises
- **57+ languages** — serve international customers naturally
- **HIPAA compliance** — available with signed BAA for healthcare businesses
- **No engineering required** — no-code configuration and managed deployment

## Common Migration Questions

**Will I lose my phone numbers?**
No. We port your existing numbers to CallSphere. The process takes 1-3 business days and we coordinate the timing to ensure zero downtime.

**Is there a contract lock-in?**
No. CallSphere offers month-to-month billing with no long-term contracts required.

**Can I run both platforms simultaneously?**
Yes. During migration, we recommend a brief parallel period where both systems are active. This ensures no calls are missed during the transition.

**How long until I see ROI?**
Most businesses see positive ROI within the first month. The combination of flat pricing, 24/7 coverage, and zero missed calls typically pays for itself quickly.

## Start Your Migration

Ready to switch from ${comp.name} to CallSphere? [Book a migration consultation](/contact) — our team handles the technical details so you can focus on your business.`,
  };
}

// ---------------------------------------------------------------------------
//  Template: FAQ posts
// ---------------------------------------------------------------------------

function faqPost(ind: typeof INDUSTRIES[number], i: number): PostSeed {
  const title = `${ind.name} AI Voice Agent FAQ: Top Questions Answered`;
  return {
    slug: slugify(title),
    title,
    description: `Frequently asked questions about AI voice agents for ${ind.name.toLowerCase()} businesses. Covers pricing, setup, compliance, integrations, and capabilities.`,
    date: dateStr(i * 2 + 120),
    category: "guides",
    readTime: "5 min read",
    tags: ["faq", ind.slug, "ai-voice-agent"],
    content: `## Frequently Asked Questions: AI Voice Agents for ${ind.name}

### How much does an AI voice agent cost for ${ind.name.toLowerCase()}?

CallSphere AI voice agents for ${ind.name.toLowerCase()} start at $149/month for the Starter plan (2,000 interactions), $499/month for Growth (10,000 interactions), and $1,499/month for Scale (50,000 interactions). All plans include voice and chat agents. Annual billing saves 15%.

### How long does it take to set up?

Most ${ind.name.toLowerCase()} businesses go live in 3-5 business days. Simple use cases like appointment scheduling can be running in 24 hours with guided onboarding.

### Does it integrate with ${ind.tools}?

Yes. CallSphere has native integrations with ${ind.tools} and 50+ other business tools. Data syncs in real time, so appointments, tickets, and records update automatically.

### Is it ${ind.compliance}?

Yes. CallSphere is ${ind.compliance}. All calls are encrypted, transcripts are stored securely, and full audit logging is available. For healthcare businesses, signed BAAs are included.

### Can the AI handle ${ind.name.toLowerCase()}-specific conversations?

Absolutely. CallSphere AI agents are configured specifically for ${ind.name.toLowerCase()} workflows. They understand industry terminology, follow your business rules, and handle common call types including scheduling, inquiries, triage, and payments.

### What happens if the AI cannot help a caller?

CallSphere includes intelligent escalation. If the AI detects a complex issue or the caller requests a human, the call is seamlessly transferred to your team with full context and conversation summary.

### How many languages does it support?

CallSphere supports 57+ languages with natural-sounding conversations. Popular languages include English, Spanish, French, German, Mandarin, Hindi, Arabic, and Portuguese.

### Can it process payments during calls?

Yes. CallSphere AI agents can securely collect payment information and process transactions through Stripe or Square during voice calls and chat, with full PCI-DSS compliance.

### Is there a free trial or demo?

Yes. You can try CallSphere AI agents live on our [demo page](/demo) — no signup required. For a personalized walkthrough tailored to ${ind.name.toLowerCase()}, [book a demo](/contact).

### What is the uptime guarantee?

Growth and Scale plans include a 99.9% uptime SLA. CallSphere infrastructure runs on redundant cloud infrastructure for maximum reliability.

[Get started with CallSphere for ${ind.name}](/contact)`,
  };
}

// ---------------------------------------------------------------------------
//  Generate all supplementary posts
// ---------------------------------------------------------------------------

function generateAllPosts(): PostSeed[] {
  const posts: PostSeed[] = [];
  const slugSet = new Set<string>();

  function addPost(post: PostSeed) {
    if (!slugSet.has(post.slug)) {
      slugSet.add(post.slug);
      posts.push(post);
    }
  }

  // Checklist posts: 20 industries
  INDUSTRIES.forEach((ind, i) => addPost(checklistPost(ind, i)));

  // Cost comparison posts: 20 industries
  INDUSTRIES.forEach((ind, i) => addPost(costComparisonPost(ind, i)));

  // Migration guide posts: 15 competitors
  COMPETITORS.forEach((comp, i) => addPost(migrationPost(comp, i)));

  // FAQ posts: 20 industries
  INDUSTRIES.forEach((ind, i) => addPost(faqPost(ind, i)));

  return posts;
}

// ---------------------------------------------------------------------------
//  Main runner
// ---------------------------------------------------------------------------

async function main() {
  console.log("🚀 Starting supplementary SEO blog post seeder...\n");

  let admin = await prisma.adminUser.findFirst({
    where: { role: "admin" },
  });

  if (!admin) {
    const email = process.env.ADMIN_EMAIL || "admin@callsphere.tech";
    const password = process.env.ADMIN_PASSWORD || "admin";
    const passwordHash = await bcrypt.hash(password, 10);
    admin = await prisma.adminUser.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: "CallSphere Team",
        role: "admin",
      },
    });
    console.log(`Created admin user: ${admin.email}`);
  }

  console.log(`Using admin: ${admin.email}\n`);

  const allPosts = generateAllPosts();
  console.log(`Generated ${allPosts.length} supplementary posts. Seeding...\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const post of allPosts) {
    try {
      const htmlContent = await marked(post.content);
      const wordCount = post.content.split(/\s+/).length;

      const data = {
        slug: post.slug,
        title: post.title,
        description: post.description,
        content: htmlContent,
        status: "published" as const,
        category: post.category,
        readTime: `${Math.max(3, Math.ceil(wordCount / 200))} min read`,
        tags: post.tags,
        authorId: admin.id,
        publishedAt: new Date(post.date),
      };

      const existing = await prisma.blogPost.findUnique({
        where: { slug: post.slug },
      });

      if (existing) {
        skipped++;
      } else {
        await prisma.blogPost.create({ data });
        created++;
      }

      if ((created + skipped) % 25 === 0) {
        console.log(`  Progress: ${created + skipped}/${allPosts.length} processed`);
      }
    } catch (err: any) {
      errors++;
      console.error(`  ✗ Error seeding "${post.slug}": ${err.message}`);
    }
  }

  console.log(`\n✅ Supplementary seeding complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped (already exist): ${skipped}`);
  console.log(`   Errors:  ${errors}`);

  const total = await prisma.blogPost.count({ where: { status: "published" } });
  console.log(`\n📊 Total published posts: ${total}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
