import { NextRequest, NextResponse } from "next/server";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import prisma from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/admin-auth";

const sesClient = new SESv2Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || "hello@mail.callsphere.tech";
const BASE_URL = "https://callsphere.tech";

function buildEmailHtml(post: { title: string; description: string; slug: string; coverImage: string | null }) {
  const postUrl = `${BASE_URL}/blog/${post.slug}`;
  const unsubscribeUrl = `${BASE_URL}/api/newsletter/unsubscribe`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      ${post.coverImage ? `<img src="${BASE_URL}${post.coverImage}" alt="${post.title}" style="width:100%;height:auto;display:block;">` : ""}
      <div style="padding:32px;">
        <p style="margin:0 0 8px;font-size:13px;color:#6366f1;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">New Article</p>
        <h1 style="margin:0 0 16px;font-size:24px;color:#0f172a;line-height:1.3;">${post.title}</h1>
        <p style="margin:0 0 24px;font-size:16px;color:#475569;line-height:1.6;">${post.description}</p>
        <a href="${postUrl}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
          Read Article
        </a>
      </div>
    </div>
    <div style="text-align:center;padding:24px 0;color:#94a3b8;font-size:12px;">
      <p style="margin:0 0 8px;">You're receiving this because you subscribed to CallSphere Blog updates.</p>
      <p style="margin:0;">
        <a href="${unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
        &nbsp;&middot;&nbsp;
        <a href="${BASE_URL}/blog" style="color:#94a3b8;text-decoration:underline;">Visit Blog</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const auth = verifyAdminToken(request);
  if (!auth.valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { postId } = await request.json();
    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
      select: { title: true, description: true, slug: true, coverImage: true, status: true },
    });

    if (!post || post.status !== "published") {
      return NextResponse.json({ error: "Post not found or not published" }, { status: 404 });
    }

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { active: true },
      select: { email: true },
    });

    if (subscribers.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "No active subscribers" });
    }

    const html = buildEmailHtml(post);
    let sent = 0;
    const errors: string[] = [];

    for (const subscriber of subscribers) {
      try {
        await sesClient.send(
          new SendEmailCommand({
            FromEmailAddress: `CallSphere Blog <${FROM_EMAIL}>`,
            Destination: { ToAddresses: [subscriber.email] },
            Content: {
              Simple: {
                Subject: { Data: `New Post: ${post.title}`, Charset: "UTF-8" },
                Body: {
                  Html: { Data: html, Charset: "UTF-8" },
                  Text: {
                    Data: `${post.title}\n\n${post.description}\n\nRead more: ${BASE_URL}/blog/${post.slug}`,
                    Charset: "UTF-8",
                  },
                },
              },
            },
          })
        );
        sent++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${subscriber.email}: ${message}`);
        console.error(`Failed to send to ${subscriber.email}:`, message);
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      total: subscribers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Newsletter notify error:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
