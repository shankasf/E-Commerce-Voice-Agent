import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { email } = subscribeSchema.parse(payload);

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.active) {
        return NextResponse.json({ success: true, message: "You're already subscribed!" });
      }
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: { active: true, subscribedAt: new Date() },
      });
      return NextResponse.json({ success: true, message: "Welcome back! You've been re-subscribed." });
    }

    await prisma.newsletterSubscriber.create({
      data: { email },
    });

    return NextResponse.json({ success: true, message: "You're subscribed! You'll get notified when we publish new posts." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
