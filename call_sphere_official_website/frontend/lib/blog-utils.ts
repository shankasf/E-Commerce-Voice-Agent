export const CATEGORY_MAP: Record<
  string,
  { name: string; title: string; description: string }
> = {
  guides: {
    name: "Guides",
    title: "AI Voice Agent Guides | CallSphere Blog",
    description:
      "Step-by-step guides on implementing AI voice agents, best practices for conversational AI, and tips for maximizing ROI.",
  },
  comparisons: {
    name: "Comparisons",
    title: "AI Voice Agent Comparisons | CallSphere Blog",
    description:
      "Side-by-side comparisons of AI voice agent platforms. See how CallSphere stacks up against alternatives.",
  },
  healthcare: {
    name: "Healthcare",
    title: "AI Voice Agents for Healthcare | CallSphere Blog",
    description:
      "How healthcare organizations use AI voice agents for appointment scheduling, patient intake, and after-hours support.",
  },
  business: {
    name: "Business",
    title: "AI for Business Communication | CallSphere Blog",
    description:
      "Insights on using AI voice and chat agents to grow revenue, reduce costs, and improve customer experience.",
  },
  technology: {
    name: "Technology",
    title: "Conversational AI Technology | CallSphere Blog",
    description:
      "Deep dives into the technology behind AI voice agents — LLMs, speech-to-text, real-time voice processing, and more.",
  },
  "case-studies": {
    name: "Case Studies",
    title: "AI Voice Agent Case Studies | CallSphere Blog",
    description:
      "Real-world results from businesses using CallSphere AI voice agents. ROI metrics, implementation stories, and lessons learned.",
  },
  news: {
    name: "News",
    title: "CallSphere News & Updates | CallSphere Blog",
    description:
      "Latest product updates, feature releases, and company news from CallSphere.",
  },
  "agentic-ai": {
    name: "Agentic AI",
    title: "Agentic AI & LLM Engineering | CallSphere Blog",
    description:
      "Deep dives into agentic AI, LLM evaluation, synthetic data generation, model selection, and production AI engineering best practices.",
  },
  "large-language-models": {
    name: "Large Language Models",
    title: "Large Language Models & LLM Insights | CallSphere Blog",
    description:
      "Explore large language model architectures, fine-tuning strategies, prompt engineering, and how LLMs power modern AI applications.",
  },
  "voice-ai-agents": {
    name: "Voice AI Agents",
    title: "Voice AI Agents & Conversational AI | CallSphere Blog",
    description:
      "Everything about voice AI agents — real-time speech processing, telephony automation, voice UX design, and production deployment.",
  },
  "chat-agents": {
    name: "Chat Agents",
    title: "AI Chat Agents & Chatbot Automation | CallSphere Blog",
    description:
      "Build and deploy intelligent chat agents for customer support, lead qualification, and automated conversations at scale.",
  },
  "machine-learning": {
    name: "Machine Learning",
    title: "Machine Learning & AI Fundamentals | CallSphere Blog",
    description:
      "Core machine learning concepts, algorithms, and techniques — from decision trees to deep learning, with practical applications across industries.",
  },
};

export function categoryNameToSlug(name: string): string {
  const entry = Object.entries(CATEGORY_MAP).find(
    ([, v]) => v.name.toLowerCase() === name.toLowerCase()
  );
  return entry ? entry[0] : name.toLowerCase().replace(/\s+/g, "-");
}

export function categorySlugToName(slug: string): string {
  return CATEGORY_MAP[slug]?.name ?? slug;
}

export type Heading = { id: string; text: string; level: number };

export function extractHeadings(html: string): Heading[] {
  const regex = /<h([23])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[23]>/gi;
  const headings: Heading[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[3].replace(/<[^>]+>/g, "").trim();
    headings.push({ id: match[2], text, level: parseInt(match[1]) });
  }
  return headings;
}

export function addHeadingIds(html: string): string {
  return html.replace(
    /<h([23])([^>]*)>(.*?)<\/h[23]>/gi,
    (_match, level: string, attrs: string, inner: string) => {
      if (/id="/.test(attrs)) return _match;
      const text = inner.replace(/<[^>]+>/g, "").trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
    }
  );
}

export type FAQ = { question: string; answer: string };

export function extractFAQs(html: string): FAQ[] {
  const faqSectionRegex =
    /<h2[^>]*>[^<]*(FAQ|Frequently Asked Questions)[^<]*<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/i;
  const sectionMatch = faqSectionRegex.exec(html);
  if (!sectionMatch) return [];

  const sectionHtml = sectionMatch[2];
  const faqs: FAQ[] = [];
  const qRegex =
    /<h3[^>]*>(.*?)<\/h3>([\s\S]*?)(?=<h3[^>]*>|$)/gi;
  let qMatch;
  while ((qMatch = qRegex.exec(sectionHtml)) !== null) {
    const question = qMatch[1].replace(/<[^>]+>/g, "").trim();
    // Extract text from paragraphs in the answer block
    const answerBlock = qMatch[2];
    const pMatches = answerBlock.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    const answer = pMatches
      ? pMatches
          .map((p) => p.replace(/<[^>]+>/g, "").trim())
          .filter(Boolean)
          .join(" ")
      : answerBlock.replace(/<[^>]+>/g, "").trim();
    if (question && answer) {
      faqs.push({ question, answer });
    }
  }
  return faqs;
}
