import "server-only";
import { accessToken } from "./crypto";
import { emails, sendEmail } from "./email";
import { baseUrl } from "./session";
import type { Application } from "./store";
import { getUser, listStaff, type User } from "./users";

/** The client's permanent sign-in link: opening it signs them straight in. */
export async function accessLink(user: User) {
  return `${await baseUrl()}/c/${accessToken(user.id, user.linkVersion ?? 1)}`;
}

/** Link for emails to the client: their sign-in link, or the bare case URL for cases with no account. */
export async function caseLinkForClient(app: Pick<Application, "id" | "ownerId">) {
  const owner = app.ownerId ? await getUser(app.ownerId) : null;
  return owner ? accessLink(owner) : `${await baseUrl()}/application/${app.id}`;
}

export async function caseLinkForStaff(appId: string) {
  return `${await baseUrl()}/admin/cases/${appId}`;
}

/** Email the office about client activity. Never throws. */
export async function notifyStaff(appId: string, subject: string, body: string) {
  try {
    const to = process.env.STAFF_NOTIFY_EMAIL
      ? process.env.STAFF_NOTIFY_EMAIL.split(",").map((s) => s.trim())
      : (await listStaff()).filter((s) => !s.disabled).map((s) => s.email);
    if (to.length === 0) return;
    const msg = emails.toStaff(subject, body, await caseLinkForStaff(appId));
    await sendEmail({ to, ...msg });
  } catch (err) {
    console.error("[notifyStaff]", err);
  }
}
