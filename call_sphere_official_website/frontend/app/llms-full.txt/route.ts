import prisma from "@/lib/prisma";

export const revalidate = 3600;

function htmlToPlainText(html: string): string {
  return (
    html
      // Convert headings to markdown-style
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n")
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n")
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n")
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n#### $1\n")
      // Convert lists
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1")
      .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
      // Convert links to markdown
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
      // Convert bold/strong
      .replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, "**$2**")
      // Convert italic/em
      .replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, "*$2*")
      // Convert blockquotes
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, "\n> $1\n")
      // Convert paragraphs and line breaks
      .replace(/<p[^>]*>(.*?)<\/p>/gis, "$1\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      // Convert horizontal rules
      .replace(/<hr\s*\/?>/gi, "\n---\n")
      // Convert tables (basic)
      .replace(/<th[^>]*>(.*?)<\/th>/gi, "| $1 ")
      .replace(/<td[^>]*>(.*?)<\/td>/gi, "| $1 ")
      .replace(/<\/tr>/gi, "|\n")
      .replace(/<\/?(table|thead|tbody|tr)[^>]*>/gi, "")
      // Strip remaining tags
      .replace(/<[^>]+>/g, "")
      // Decode HTML entities
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      // Clean up whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export async function GET() {
  const baseUrl = "https://callsphere.tech";

  const posts = await prisma.blogPost.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    select: {
      slug: true,
      title: true,
      description: true,
      content: true,
      category: true,
      tags: true,
      publishedAt: true,
      readTime: true,
    },
  });

  const header = `# CallSphere Blog — Full Content (LLM-Optimized)

> This file contains the full text of all ${posts.length} published blog posts from CallSphere (${baseUrl}/blog).
> It is designed for consumption by large language models, AI assistants, and search engines.
> Last updated: ${new Date().toISOString().split("T")[0]}

---
`;

  const articles = posts
    .map((post) => {
      const plainContent = htmlToPlainText(post.content);
      const date = post.publishedAt
        ? new Date(post.publishedAt).toISOString().split("T")[0]
        : "N/A";

      return `
# ${post.title}

- URL: ${baseUrl}/blog/${post.slug}
- Category: ${post.category}
- Published: ${date}
- Read Time: ${post.readTime}
- Tags: ${post.tags.join(", ")}

> ${post.description}

${plainContent}

---`;
    })
    .join("\n");

  const text = header + articles;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
