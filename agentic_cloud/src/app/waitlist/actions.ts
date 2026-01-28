"use server";

import nodemailer from "nodemailer";
import type { WaitlistFormData } from "@/types";

// Create SMTP transporter for AWS SES
const transporter = nodemailer.createTransport({
  host: `email-smtp.${process.env.AWS_SES_REGION || "us-east-1"}.amazonaws.com`,
  port: 587,
  secure: false,
  auth: {
    user: process.env.AWS_SMTP_USER,
    pass: process.env.AWS_SMTP_PASS,
  },
});

// Send email to admin notification
async function sendAdminNotification(data: WaitlistFormData): Promise<void> {
  const adminEmail = process.env.CONTACT_RECIPIENT || "sagar@callsphere.tech";

  await transporter.sendMail({
    from: process.env.SES_FROM_EMAIL || "noreply@callsphere.tech",
    to: adminEmail,
    subject: `New Waitlist Signup: ${data.fullName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">New Agentic Cloud Waitlist Signup</h2>
        <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${data.fullName}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Company:</strong> ${data.company || "Not provided"}</p>
          <p><strong>Role:</strong> ${data.role || "Not provided"}</p>
          <p><strong>Expected Scale:</strong> ${data.expectedScale || "Not provided"}</p>
          <p><strong>Use Case:</strong> ${data.useCase || "Not provided"}</p>
          <p><strong>Submitted:</strong> ${new Date().toISOString()}</p>
        </div>
      </div>
    `,
  });
}

// Send confirmation email to user
async function sendUserConfirmation(data: WaitlistFormData): Promise<void> {
  await transporter.sendMail({
    from: process.env.SES_FROM_EMAIL || "noreply@callsphere.tech",
    to: data.email,
    subject: "Welcome to Agentic Cloud Waitlist!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Agentic Cloud</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Complete Cloud Infrastructure Under One Roof</p>
        </div>

        <div style="padding: 30px 20px; background: #ffffff;">
          <h2 style="color: #1f2937;">Welcome, ${data.fullName}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thank you for joining the Agentic Cloud waitlist. You're now on the list for early access to our AI-powered cloud infrastructure platform.
          </p>

          <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #7c3aed; margin-top: 0;">What's Next?</h3>
            <ul style="color: #4b5563; line-height: 1.8;">
              <li>We'll review your application</li>
              <li>You'll receive an invite when it's your turn</li>
              <li>Early adopters get exclusive pricing</li>
            </ul>
          </div>

          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Our Services</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; color: #4b5563;">
              <div>• Domain Registration</div>
              <div>• VPS + DNS Management</div>
              <div>• Full JS Stack (Next.js)</div>
              <div>• Email Services</div>
              <div>• Redis Cache</div>
              <div>• Kubernetes Cluster</div>
              <div>• MongoDB Cluster</div>
              <div>• PostgreSQL Database</div>
            </div>
          </div>

          <p style="color: #4b5563; line-height: 1.6;">
            Questions? Reply to this email or contact us at <a href="mailto:sagar@callsphere.tech" style="color: #7c3aed;">sagar@callsphere.tech</a>
          </p>
        </div>

        <div style="background: #1f2937; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            © ${new Date().getFullYear()} CallSphere LLC. All rights reserved.
          </p>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
            27 Orchard Pl, Poughkeepsie, NY 12601
          </p>
        </div>
      </div>
    `,
  });
}

export async function submitWaitlist(data: WaitlistFormData): Promise<void> {
  // Validate required fields
  if (!data.fullName || !data.email) {
    throw new Error("Full name and email are required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error("Invalid email format");
  }

  // Log for tracking
  console.log("Waitlist submission received:", {
    email: data.email,
    name: data.fullName,
    company: data.company,
    role: data.role,
    scale: data.expectedScale,
    timestamp: new Date().toISOString(),
  });

  // Send emails
  try {
    // Send both emails in parallel
    await Promise.all([
      sendAdminNotification(data),
      sendUserConfirmation(data),
    ]);
    console.log("Emails sent successfully to admin and user");
  } catch (error) {
    console.error("Failed to send emails:", error);
    // Don't throw - we still want to count them as signed up
  }

  return;
}

// Helper to get all waitlist entries (for admin purposes)
export async function getWaitlistEntries(): Promise<WaitlistFormData[]> {
  // TODO: Implement MongoDB storage
  return [];
}
