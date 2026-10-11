import "server-only";

// Transactional email via the Resend REST API. Optional: without RESEND_API_KEY nothing is sent,
// and the UI shows staff a link to copy into WhatsApp / their own email instead.
//   RESEND_API_KEY  — from resend.com (domain must be verified to email clients)
//   EMAIL_FROM      — e.g. "JT Immigration <noreply@jtimmigration.ie>"
//   EMAIL_REPLY_TO  — optional, e.g. the office inbox
//   STAFF_NOTIFY_EMAIL — optional; otherwise all staff accounts are notified

export type EmailResult = { ok: true } | { ok: false; reason: string };

export const emailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

export async function sendEmail(input: { to: string | string[]; subject: string; text: string; idempotencyKey?: string }): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.info(`[email not configured] to=${[input.to].flat().join(", ")} subject="${input.subject}"`);
    return { ok: false, reason: "Email isn't set up yet" };
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  if (input.idempotencyKey) headers["Idempotency-Key"] = input.idempotencyKey.slice(0, 256);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      console.error(`[email failed] ${res.status} ${data.message ?? ""}`);
      return { ok: false, reason: data.message ?? `Email service error (${res.status})` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email failed]", err);
    return { ok: false, reason: "Couldn't reach the email service" };
  }
}

const SIGNOFF = "\n\n— JT Immigration";

export const emails = {
  invite: (name: string, link: string, note?: string) => ({
    subject: "Your JT Immigration citizenship portal",
    text: `Hi ${name},\n\nJT Immigration has set up a secure online space for your Irish citizenship application. Open the link below to upload your documents and answer the questions at your own pace — no password needed.\n\n${link}\n\nThe link is personal to you, so please don't share it.${note ? `\n\n${note}` : ""}${SIGNOFF}`,
  }),
  issues: (name: string, items: string[], link: string, note?: string) => ({
    subject: "Action needed on your citizenship application",
    text: `Hi ${name},\n\nWe've reviewed your documents. Please look at the following:\n\n${items.map((i) => `• ${i}`).join("\n")}${note ? `\n\n${note}` : ""}\n\nOpen your application to see the details and upload replacements:\n${link}${SIGNOFF}`,
  }),
  messageToClient: (name: string, link: string) => ({
    subject: "New message from JT Immigration",
    text: `Hi ${name},\n\nYou have a new message about your citizenship application. Open your application to read and reply:\n\n${link}${SIGNOFF}`,
  }),
  stageToClient: (name: string, stage: string, link: string) => ({
    subject: `Your citizenship application: ${stage}`,
    text: `Hi ${name},\n\nThe status of your application has been updated to: ${stage}.\n\nOpen your application for details:\n${link}${SIGNOFF}`,
  }),
  toStaff: (subject: string, body: string, link: string) => ({
    subject: `[Portal] ${subject}`,
    text: `${body}\n\nOpen the case: ${link}`,
  }),
};
