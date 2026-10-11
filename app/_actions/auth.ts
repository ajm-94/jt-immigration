"use server";

import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { endSession, getViewer, requireUser, safeNext, startSession } from "@/lib/session";
import { getApplication, updateApplication, withActivity } from "@/lib/store";
import {
  EmailTakenError,
  createUser,
  getUser,
  isValidEmail,
  listStaff,
  normalizeEmail,
  updateUser,
  type User,
} from "@/lib/users";
import type { FormState } from "@/components/forms";

const str = (form: FormData, name: string, max = 200) => String(form.get(name) ?? "").trim().slice(0, max);

function checkNewPassword(form: FormData): string | null {
  const pw = String(form.get("password") ?? "");
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 200) return "Password is too long.";
  if (form.has("confirm") && pw !== String(form.get("confirm") ?? "")) return "The two passwords don't match.";
  return null;
}

const homeFor = (u: Pick<User, "role">) => (u.role === "staff" ? "/admin" : "/portal");

/** There is one staff account: sign in with its password, or with ADMIN_PASSWORD (set in Vercel) as a backup key. */
export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (!password) return { error: "Enter the password." };
  const staff = (await listStaff()).filter((s) => !s.disabled).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  let user: User | undefined;
  if (staff && (await verifyPassword(password, staff.passwordHash))) user = staff;
  else if (matchesAdminPassword(password)) {
    // The first sign-in with ADMIN_PASSWORD creates the staff account.
    user = staff ?? (await createUser({ name: "JT Immigration", role: "staff", passwordHash: await hashPassword(password) }));
  }
  if (!user) return { error: "Wrong password." };
  const updated = await updateUser(user.id, (u) => ({ ...u, lastLoginAt: new Date().toISOString() }));
  await startSession(updated);
  redirect(safeNext(form.get("next"), homeFor(updated)));
}

function matchesAdminPassword(password: string) {
  const admin = process.env.ADMIN_PASSWORD;
  if (!admin) return false;
  const digest = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(password), digest(admin));
}

export async function logout() {
  const viewer = await getViewer();
  await endSession();
  redirect(viewer?.role === "staff" ? "/login" : "/");
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireUser();
  const user = await getUser(viewer.id);
  if (!user || !(await verifyPassword(String(form.get("current") ?? ""), user.passwordHash))) return { error: "Your current password is incorrect." };
  const pwError = checkNewPassword(form);
  if (pwError) return { error: pwError };
  const hash = await hashPassword(String(form.get("password")));
  const updated = await updateUser(user.id, (u) => ({ ...u, passwordHash: hash, sessionVersion: u.sessionVersion + 1 }));
  await startSession(updated);
  return { ok: "Password changed. Other devices have been signed out." };
}

/** Applications started before accounts existed: whoever holds the private link can attach it to a new account. */
export async function claimApplication(appId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const app = await getApplication(appId);
  if (!app) return { error: "Application not found." };
  if (app.ownerId) return { error: "This application already has an account. Please sign in." };
  const viewer = await getViewer();
  let user: User | null = viewer && viewer.role === "client" ? await getUser(viewer.id) : null;
  if (!user) {
    const name = str(form, "name", 120);
    const email = normalizeEmail(str(form, "email"));
    if (!name) return { error: "Please enter your name." };
    if (!isValidEmail(email)) return { error: "Please enter a valid email address." };
    const pwError = checkNewPassword(form);
    if (pwError) return { error: pwError };
    try {
      user = await createUser({ email, name, role: "client", passwordHash: await hashPassword(String(form.get("password"))) });
    } catch (e) {
      if (e instanceof EmailTakenError) return { error: "You already have an account with this email — sign in first, then open this link again." };
      throw e;
    }
  }
  const owner = user;
  let claimed = false;
  await updateApplication(appId, (a) => {
    if (a.ownerId) return a;
    claimed = true;
    return withActivity({ ...a, ownerId: owner.id, clientName: a.clientName ?? owner.name, clientEmail: owner.email }, owner.name, "Client created an account for this application");
  });
  if (!claimed) return { error: "This application was just claimed by another account." };
  const updated = await updateUser(owner.id, (u) => ({ ...u, applicationIds: [...new Set([...u.applicationIds, appId])] }));
  await startSession(updated);
  redirect(`/application/${appId}`);
}
