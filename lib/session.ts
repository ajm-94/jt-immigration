import "server-only";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { createToken, verifyToken } from "./crypto";
import { getApplication, type Application } from "./store";
import { getUser, type User } from "./users";

const SESSION_COOKIE = "jt_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export type Viewer = Pick<User, "id" | "email" | "name" | "role" | "applicationIds">;

/** Only callable from Server Actions / Route Handlers (cookies can't be set during render). */
export async function startSession(user: User) {
  const token = createToken({ sub: user.id, purpose: "session", ver: String(user.sessionVersion) }, MAX_AGE);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user for this request, re-validated against the stored record. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const payload = verifyToken((await cookies()).get(SESSION_COOKIE)?.value, "session");
  if (!payload) return null;
  const user = await getUser(payload.sub);
  if (!user || user.disabled || String(user.sessionVersion) !== payload.ver) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role, applicationIds: user.applicationIds };
});

export async function requireUser(next?: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return viewer;
}

export async function requireStaff() {
  const viewer = await requireUser();
  if (viewer.role !== "staff") notFound();
  return viewer;
}

export const canAccess = (viewer: Viewer, app: Application) => viewer.role === "staff" || app.ownerId === viewer.id;

/** For pages and server actions: the application if the viewer may see it, otherwise 404 / login. */
export async function requireApplication(id: string): Promise<{ viewer: Viewer; app: Application }> {
  // Clients only get in through their personal link, so a signed-out visitor goes to the page that says so.
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const app = await getApplication(id);
  if (!app || !canAccess(viewer, app)) notFound();
  return { viewer, app };
}

/** For staff pages and actions. */
export async function requireStaffApplication(id: string) {
  const viewer = await requireStaff();
  const app = await getApplication(id);
  if (!app) notFound();
  return { viewer, app };
}

/** Absolute base URL for links in emails. */
export async function baseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Only allow same-site relative redirects. */
export function safeNext(next: unknown, fallback: string) {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}
