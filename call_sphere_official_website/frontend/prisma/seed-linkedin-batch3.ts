import { PrismaClient } from "@prisma/client";
import { marked } from "marked";
import bcrypt from "bcryptjs";
import { linkedInPostsBatch3 } from "../content/blog/linkedin-newsletter-batch3";

const prisma = new PrismaClient();

async function main() {
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
        name: "Admin",
        role: "admin",
      },
    });
    console.log(`Created admin user: ${admin.email}`);
  }

  console.log(`Using admin user: ${admin.email} (${admin.name})`);

  let seeded = 0;
  for (const post of linkedInPostsBatch3) {
    const htmlContent = await marked(post.content);

    const wordCount = htmlContent
      .replace(/<[^>]*>/g, "")
      .split(/\s+/)
      .filter(Boolean).length;
    const readTime = `${Math.max(1, Math.ceil(wordCount / 200))} min read`;

    const data = {
      slug: post.slug,
      title: post.title,
      description: post.description,
      content: htmlContent,
      status: "published" as const,
      category: post.category,
      readTime,
      tags: post.tags,
      authorId: admin.id,
      publishedAt: new Date(post.date),
    };

    const result = await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: data,
      create: data,
    });

    console.log(`✓ ${result.title} (${result.slug}) — ${readTime}`);
    seeded++;
  }

  console.log(`\nSeeded ${seeded} blog posts (batch 3) successfully.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
