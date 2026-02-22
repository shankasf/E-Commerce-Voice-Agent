import prisma from "@/lib/prisma";

export const revalidate = 3600;

export async function GET() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    select: {
      slug: true,
      title: true,
      description: true,
      content: true,
      publishedAt: true,
      updatedAt: true,
      category: true,
      tags: true,
      readTime: true,
    },
  });

  const baseUrl = "https://callsphere.tech";
  const now = new Date().toUTCString();

  const items = posts
    .map((post) => {
      const pubDate = post.publishedAt
        ? new Date(post.publishedAt).toUTCString()
        : now;
      // CDATA handles raw HTML — no need to escape
      const tags = post.tags
        .map((t) => `      <category><![CDATA[${t}]]></category>`)
        .join("\n");

      return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.description}]]></description>
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
${tags}
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>CallSphere Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Expert guides on AI voice agents, agentic AI, LLM engineering, contact center automation, and conversational AI.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/blog/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
