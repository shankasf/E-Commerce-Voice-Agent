import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (email) {
    try {
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: { active: false },
      });
    } catch {
      // Ignore if email not found
    }
  }

  return new NextResponse(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Unsubscribed</title></head>
<body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f1f5f9;">
  <div style="text-align:center;padding:40px;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color:#0f172a;margin:0 0 8px;">Unsubscribed</h1>
    <p style="color:#64748b;margin:0 0 24px;">You've been removed from the CallSphere blog newsletter.</p>
    <a href="https://callsphere.tech/blog" style="color:#4f46e5;text-decoration:none;font-weight:600;">Back to Blog</a>
  </div>
</body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await prisma.newsletterSubscriber.update({
      where: { email },
      data: { active: false },
    });

    return NextResponse.json({ success: true, message: "You've been unsubscribed." });
  } catch {
    return NextResponse.json({ success: true, message: "You've been unsubscribed." });
  }
}
