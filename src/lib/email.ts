import nodemailer, { type Transporter } from "nodemailer";
import { render } from "@react-email/render";
import type { ReactElement } from "react";

/**
 * Transactional email over SMTP. Works with any provider that gives you SMTP
 * credentials - Gmail (app password), Brevo, Resend, Postmark - so there is no
 * vendor lock-in and the free tiers are enough for a small business.
 *
 *   SMTP_URL="smtps://user:pass@smtp.gmail.com:465"
 *   EMAIL_FROM="GlideBook <you@gmail.com>"
 *
 * When SMTP_URL is missing, sends are skipped and logged so the app keeps working.
 */

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const url = process.env.SMTP_URL;
  if (!url) {
    transporter = null;
    return null;
  }
  transporter = nodemailer.createTransport(url);
  return transporter;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_URL && process.env.EMAIL_FROM);
}

export interface Attachment {
  filename: string;
  content: string;
  contentType: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string;
  attachments?: Attachment[];
}

/** Send one email. Never throws - a failed notification must not fail a booking. */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const transport = getTransporter();
  const from = process.env.EMAIL_FROM;
  if (!transport || !from) {
    console.info(`[email] skipped (not configured): "${input.subject}" -> ${input.to}`);
    return false;
  }
  try {
    const [html, text] = await Promise.all([render(input.react), render(input.react, { plainText: true })]);
    await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html,
      text,
      replyTo: input.replyTo,
      attachments: input.attachments,
    });
    return true;
  } catch (err) {
    console.error(`[email] failed: "${input.subject}" -> ${input.to}`, err);
    return false;
  }
}

export function appUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}
