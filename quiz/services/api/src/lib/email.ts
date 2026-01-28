import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'smtp';

// SES Client
const sesClient = process.env.SES_REGION ? new SESClient({
  region: process.env.SES_REGION,
  credentials: {
    accessKeyId: process.env.SES_ACCESS_KEY!,
    secretAccessKey: process.env.SES_SECRET_KEY!
  }
}) : null;

// SMTP Transporter
const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined
});

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const from = process.env.EMAIL_FROM || 'noreply@example.com';
  const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

  if (EMAIL_PROVIDER === 'ses' && sesClient) {
    const command = new SendEmailCommand({
      Source: from,
      Destination: {
        ToAddresses: toAddresses
      },
      Message: {
        Subject: { Data: options.subject },
        Body: {
          Html: { Data: options.html },
          Text: { Data: options.text || options.html.replace(/<[^>]*>/g, '') }
        }
      }
    });
    await sesClient.send(command);
  } else {
    await smtpTransporter.sendMail({
      from,
      to: toAddresses.join(', '),
      subject: options.subject,
      html: options.html,
      text: options.text
    });
  }
}

export interface QuizResultData {
  userEmail: string;
  userName: string;
  quizTitle: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  passingPercent: number;
  attemptNo: number;
  restartCount: number;
  startedAt: string;
  endedAt: string;
  timeLimitSec: number;
  deviceInfo?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

function formatDuration(startedAt: string, endedAt: string): string {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const durationMs = end - start;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

function parseDeviceInfo(deviceInfo: Record<string, unknown> | null | undefined): string {
  if (!deviceInfo) return 'Not available';
  const parts: string[] = [];
  if (deviceInfo.platform) parts.push(`Platform: ${deviceInfo.platform}`);
  if (deviceInfo.browser) parts.push(`Browser: ${deviceInfo.browser}`);
  if (deviceInfo.screenResolution) parts.push(`Screen: ${deviceInfo.screenResolution}`);
  return parts.length > 0 ? parts.join(', ') : JSON.stringify(deviceInfo);
}

export async function sendQuizResultEmail(data: QuizResultData): Promise<void> {
  const {
    userEmail,
    userName,
    quizTitle,
    score,
    passed,
    totalQuestions,
    correctAnswers,
    passingPercent,
    attemptNo,
    restartCount,
    startedAt,
    endedAt,
    timeLimitSec,
    deviceInfo,
    ip,
    userAgent
  } = data;

  const statusText = passed ? 'Passed' : 'Failed';
  const statusColor = passed ? '#22c55e' : '#ef4444';
  const statusBg = passed ? '#dcfce7' : '#fee2e2';
  const duration = formatDuration(startedAt, endedAt);
  const timeLimitMin = Math.ceil(timeLimitSec / 60);

  await sendEmail({
    to: userEmail,
    subject: `Quiz Result: ${quizTitle} - ${statusText}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Quiz Results</h1>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>You have completed the quiz: <strong>${quizTitle}</strong></p>

        <!-- Score Card -->
        <div style="background: ${statusBg}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
          <p style="font-size: 28px; margin: 0; color: #1f2937;">
            Score: <strong>${score.toFixed(1)}%</strong>
          </p>
          <p style="font-size: 22px; color: ${statusColor}; margin: 10px 0 0 0; font-weight: bold;">
            ${statusText}
          </p>
        </div>

        <!-- Details Table -->
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="background: #f9fafb;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Correct Answers</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${correctAnswers} out of ${totalQuestions}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Passing Score</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${passingPercent}%</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Time Taken</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${duration} (Limit: ${timeLimitMin} min)</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Attempt Number</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">#${attemptNo}</td>
          </tr>
          ${restartCount > 0 ? `
          <tr style="background: #f9fafb;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Restarts</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${restartCount}</td>
          </tr>
          ` : ''}
          <tr ${restartCount > 0 ? '' : 'style="background: #f9fafb;"'}>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Submitted At</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatDateTime(endedAt)}</td>
          </tr>
        </table>

        <p style="color: #6b7280; font-size: 14px;">Thank you for taking the quiz!</p>
      </div>
    `
  });

  // Notify admins with comprehensive data
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  if (adminEmails.length > 0) {
    const deviceInfoStr = parseDeviceInfo(deviceInfo);

    await sendEmail({
      to: adminEmails,
      subject: `[Admin] Quiz Submission: ${userName} - ${quizTitle} (${score.toFixed(1)}% - ${statusText})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">New Quiz Submission</h2>

          <!-- Status Banner -->
          <div style="background: ${statusBg}; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${statusColor};">
            <span style="font-size: 24px; font-weight: bold;">${score.toFixed(1)}%</span>
            <span style="font-size: 18px; color: ${statusColor}; margin-left: 10px; font-weight: bold;">${statusText}</span>
          </div>

          <!-- User & Quiz Info -->
          <h3 style="color: #374151; margin-top: 25px;">User Information</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="background: #f9fafb;">
              <td style="padding: 10px; border: 1px solid #e5e7eb; width: 35%;"><strong>Name</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${userName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Email</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><a href="mailto:${userEmail}">${userEmail}</a></td>
            </tr>
          </table>

          <!-- Quiz Performance -->
          <h3 style="color: #374151; margin-top: 25px;">Quiz Performance</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="background: #f9fafb;">
              <td style="padding: 10px; border: 1px solid #e5e7eb; width: 35%;"><strong>Quiz</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${quizTitle}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Score</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${score.toFixed(1)}% (Passing: ${passingPercent}%)</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Correct Answers</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${correctAnswers} / ${totalQuestions}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Time Taken</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${duration} (Limit: ${timeLimitMin} min)</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Attempt #</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${attemptNo}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Restart Count</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${restartCount}</td>
            </tr>
          </table>

          <!-- Timing Info -->
          <h3 style="color: #374151; margin-top: 25px;">Timing</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="background: #f9fafb;">
              <td style="padding: 10px; border: 1px solid #e5e7eb; width: 35%;"><strong>Started</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${formatDateTime(startedAt)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Submitted</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${formatDateTime(endedAt)}</td>
            </tr>
          </table>

          <!-- Device & Network Info -->
          <h3 style="color: #374151; margin-top: 25px;">Device & Network</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="background: #f9fafb;">
              <td style="padding: 10px; border: 1px solid #e5e7eb; width: 35%;"><strong>IP Address</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${ip || 'Not available'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Device Info</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${deviceInfoStr}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>User Agent</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; word-break: break-all; font-size: 12px;">${userAgent || 'Not available'}</td>
            </tr>
          </table>
        </div>
      `
    });
  }
}
