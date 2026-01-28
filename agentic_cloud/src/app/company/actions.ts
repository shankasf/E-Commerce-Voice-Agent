"use server";

import nodemailer from "nodemailer";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

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

export async function submitContactForm(data: ContactFormData): Promise<void> {
  // Validate required fields
  if (!data.name || !data.email || !data.subject || !data.message) {
    throw new Error("All fields are required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error("Invalid email format");
  }

  const adminEmail = process.env.CONTACT_RECIPIENT || "sagar@callsphere.tech";

  // Log for tracking
  console.log("Contact form submission received:", {
    email: data.email,
    name: data.name,
    subject: data.subject,
    timestamp: new Date().toISOString(),
  });

  try {
    // Send email to admin
    await transporter.sendMail({
      from: process.env.SES_FROM_EMAIL || "noreply@callsphere.tech",
      to: adminEmail,
      replyTo: data.email,
      subject: `Contact Form: ${data.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">New Contact Form Submission</h2>
          <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>From:</strong> ${data.name}</p>
            <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
            <p><strong>Subject:</strong> ${data.subject}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;" />
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${data.message}</p>
          </div>
          <p style="color: #6b7280; font-size: 12px;">
            Submitted: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    });

    // Send confirmation to user
    await transporter.sendMail({
      from: process.env.SES_FROM_EMAIL || "noreply@callsphere.tech",
      to: data.email,
      subject: "We received your message - Agentic Cloud",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Agentic Cloud</h1>
          </div>

          <div style="padding: 30px 20px; background: #ffffff;">
            <h2 style="color: #1f2937;">Thanks for reaching out, ${data.name}!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              We've received your message and will get back to you as soon as possible, usually within 24 hours.
            </p>

            <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #7c3aed; margin-top: 0;">Your Message</h3>
              <p style="color: #4b5563;"><strong>Subject:</strong> ${data.subject}</p>
              <p style="color: #4b5563; white-space: pre-wrap;">${data.message}</p>
            </div>
          </div>

          <div style="background: #1f2937; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
            <p style="color: #9ca3af; margin: 0; font-size: 14px;">
              &copy; ${new Date().getFullYear()} CallSphere LLC. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Contact form emails sent successfully");
  } catch (error) {
    console.error("Failed to send contact form emails:", error);
    throw new Error("Failed to send message. Please try again.");
  }
}
