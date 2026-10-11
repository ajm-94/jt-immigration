import "server-only";
import { createJson, deletePaths, getJson, putJson, updateJson } from "./blobdb";
import { emailKey } from "./crypto";

export type Role = "client" | "staff";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash?: string;
  /** Bumped on password change / sign-out-everywhere; sessions carrying an old version are rejected. */
  sessionVersion: number;
  /** Clients sign in with a personal link; bumping this kills every earlier link. */
  linkVersion?: number;
  applicationIds: string[];
  createdAt: string;
  activatedAt?: string;
  lastLoginAt?: string;
  disabled?: boolean;
};

const userPath = (id: string) => `users/${id}.json`;
const emailPath = (email: string) => `users-by-email/${emailKey(email)}.json`;
const STAFF_INDEX = "staff-index.json";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function getUser(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  return getJson<User>(userPath(id));
}

export async function getUserByEmail(email: string) {
  const idx = await getJson<{ userId: string }>(emailPath(normalizeEmail(email)));
  return idx ? getUser(idx.userId) : null;
}

export class EmailTakenError extends Error {}

export async function createUser(input: { email?: string; name: string; role: Role; passwordHash?: string; applicationIds?: string[] }) {
  const email = normalizeEmail(input.email ?? "");
  if (email && (await getUserByEmail(email))) throw new EmailTakenError("An account with this email already exists");
  const now = new Date().toISOString();
  const user: User = {
    id: crypto.randomUUID(),
    email,
    name: input.name.trim(),
    role: input.role,
    passwordHash: input.passwordHash,
    sessionVersion: 1,
    applicationIds: input.applicationIds ?? [],
    createdAt: now,
    activatedAt: input.passwordHash ? now : undefined,
  };
  await putJson(userPath(user.id), user);
  if (email) {
    try {
      await createJson(emailPath(email), { userId: user.id });
    } catch {
      // Lost a race for this email (or a stale index entry). Re-check who owns it.
      const owner = await getJson<{ userId: string }>(emailPath(email));
      if (owner?.userId !== user.id && (owner && (await getUser(owner.userId)))) {
        await deletePaths([userPath(user.id)]);
        throw new EmailTakenError("An account with this email already exists");
      }
      await putJson(emailPath(email), { userId: user.id });
    }
  }
  if (user.role === "staff") await addToStaffIndex(user.id);
  return user;
}

export function updateUser(id: string, mutate: (u: User) => User) {
  return updateJson<User>(userPath(id), mutate);
}

export async function changeUserEmail(id: string, newEmail: string) {
  const email = normalizeEmail(newEmail);
  const user = await getUser(id);
  if (!user) throw new Error("User not found");
  if (user.email === email) return user;
  if (email) {
    const other = await getUserByEmail(email);
    if (other && other.id !== id) throw new EmailTakenError("Another account already uses this email");
    await putJson(emailPath(email), { userId: id });
  }
  const updated = await updateUser(id, (u) => ({ ...u, email }));
  if (user.email) await deletePaths([emailPath(user.email)]);
  return updated;
}

export async function deleteUser(user: User) {
  await deletePaths([userPath(user.id), ...(user.email ? [emailPath(user.email)] : [])]);
  if (user.role === "staff") {
    await updateJson<{ ids: string[] }>(STAFF_INDEX, (s) => ({ ids: s.ids.filter((x) => x !== user.id) })).catch(() => {});
  }
}

async function addToStaffIndex(id: string) {
  const existing = await getJson<{ ids: string[] }>(STAFF_INDEX);
  if (!existing) {
    try {
      await createJson(STAFF_INDEX, { ids: [id] });
      return;
    } catch {
      // created concurrently — fall through to update
    }
  }
  await updateJson<{ ids: string[] }>(STAFF_INDEX, (s) => ({ ids: [...new Set([...s.ids, id])] }));
}

export async function listStaff(): Promise<User[]> {
  const idx = await getJson<{ ids: string[] }>(STAFF_INDEX);
  const users = await Promise.all((idx?.ids ?? []).map(getUser));
  return users.filter((u): u is User => !!u && u.role === "staff");
}

/** Login lockout: 10 failed attempts → locked for 15 minutes. */
