import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2),
  company: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  monthlyCalls: z.string().min(1),
  message: z.string().min(10),
});

const CONTACT_RECIPIENT =
  process.env.CONTACT_RECIPIENT ?? "sagar@callsphere.tech";
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "CallSphere LLC <sagar@callsphere.tech>";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const buildHtml = (data: z.infer<typeof contactSchema>) => `
  <div style="font-family: Inter, Arial, sans-serif; padding: 32px; background:#0f172a; color:#e2e8f0;">
    <h1 style="color:#38bdf8; margin-bottom: 16px;">New CallSphere demo request</h1>
    <p style="margin:0 0 24px;">A prospect just submitted the homepage form. Reply to this email or reach out via the details below.</p>
    <table style="width:100%; border-collapse: collapse;">
      <tbody>
        <tr>
          <td style="padding:12px; border:1px solid rgba(148,163,184,0.3); width:160px;">Name</td>
          <td style="padding:12px; border:1px solid rgba(148,163,184,0.3);">${data.name}</td>
        </tr>
        <tr>
          <td style="padding:12px; border:1px solid rgba(148,163,184,0.3);">Company</td>
          <td style="padding:12px; border:1px solid rgba(148,163,184,0.3);">${data.company}</td>
        </tr>
        <tr>
          <td style="padding:12px; border:1px solid rgba(148,163,184,0.3);">Email</td>
          <td style="padding:12px; border:1px solid rgba(148,163,184,0.3);">${data.email}</td>
        </tr>
        <tr>
          <td style="padding:12px; border:1px solid rgba(148,163,184,0.3);">Phone</td>
          <td style="padding:12px; border:1px solid rgba(148,163,184,0.3);">${data.phone}</td>
        </tr>
        <tr>
          <td style="padding:12px; border:1px solid rgba(148,163,184,0.3);">Monthly calls</td>
          <td style="padding:12px; border:1px solid rgba(148,163,184,0.3);">${data.monthlyCalls}</td>
        </tr>
      </tbody>
    </table>
    <div style="margin-top:24px; padding:16px; background:rgba(56,189,248,0.12); border-radius:16px;">
      <h2 style="margin:0 0 8px; font-size:16px; color:#38bdf8;">Message</h2>
      <p style="margin:0; line-height:1.6; white-space:pre-wrap;">${data.message}</p>
    </div>
  </div>
`;

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = contactSchema.parse(payload);

    if (resendClient) {
      const { error } = await resendClient.emails.send({
        from: RESEND_FROM_EMAIL,
        to: CONTACT_RECIPIENT,
        replyTo: data.email,
        subject: `Demo request from ${data.name} (${data.company})`,
        html: buildHtml(data),
      });

      if (error) {
        console.error("Resend email error", error);
        return NextResponse.json(
          { success: false, error: "Unable to send email. Try again later." },
          { status: 502 }
        );
      }
    } else {
      console.info("Contact request received for sagar@callsphere.tech", data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact API error", error);
    return NextResponse.json(
      { success: false, error: "Invalid payload" },
      { status: 400 }
    );
  }
}
