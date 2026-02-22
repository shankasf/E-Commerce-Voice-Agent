import { PrismaClient } from "@prisma/client";
import { marked } from "marked";
import bcrypt from "bcryptjs";
import { blogPosts } from "../content/blog/posts";

const prisma = new PrismaClient();

async function main() {
  // Find or create admin user
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

  for (const post of blogPosts) {
    // Convert markdown content to HTML
    const htmlContent = await marked(post.content);

    const data = {
      slug: post.slug,
      title: post.title,
      description: post.description,
      content: htmlContent,
      status: "published" as const,
      category: post.category,
      readTime: post.readTime,
      tags: post.tags,
      authorId: admin.id,
      publishedAt: new Date(post.date),
    };

    const result = await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: data,
      create: data,
    });

    console.log(`✓ ${result.title} (${result.slug})`);
  }

  console.log(`\nSeeded ${blogPosts.length} blog posts successfully.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
