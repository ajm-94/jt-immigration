"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/forms";
import { ISSUE_REASONS, documentTitle, documentsFor, getBasis } from "@/lib/citizenship";
import { emails, sendEmail } from "@/lib/email";
import { accessLink, caseLinkForClient } from "@/lib/notify";
import { requireStaff, requireStaffApplication } from "@/lib/session";
import { isStage, stageInfo } from "@/lib/status";
import { createApplication, deleteApplicationData, listUploads, updateApplication, withActivity, type CaseInfo } from "@/lib/store";
import { EmailTakenError, changeUserEmail, createUser, deleteUser, getUser, getUserByEmail, isValidEmail, normalizeEmail, updateUser } from "@/lib/users";

const str = (form: FormData, name: string, max = 300) => String(form.get(name) ?? "").trim().slice(0, max);
const emailFailNote = (reason: string) => `${reason}. Copy this link and send it to the client yourself (e.g. WhatsApp):`;

function revalidateCase(id: string) {
  revalidatePath(`/admin/cases/${id}`);
  revalidatePath(`/application/${id}`);
  revalidatePath("/admin");
}

// ---------- Clients ----------

export async function inviteClient(_prev: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const name = str(form, "name", 120);
  const email = normalizeEmail(str(form, "email"));
  const basis = getBasis(str(form, "basis"));
  const note = str(form, "note", 2000);
  if (!name) return { error: "Enter the client's name." };
  if (email && !isValidEmail(email)) return { error: "That email address doesn't look right." };
  if (!basis) return { error: "Choose the application basis." };

  const existing = email ? await getUserByEmail(email) : null;
  if (existing) {
    return { error: existing.role === "staff" ? "That email belongs to a staff account." : `A client with this email already exists${existing.applicationIds[0] ? " — open their case from the Cases list" : ""}.` };
  }
  let user;
  try {
    user = await createUser({ email, name, role: "client" });
  } catch (e) {
    if (e instanceof EmailTakenError) return { error: "A client with this email already exists." };
    throw e;
  }
  const app = await createApplication({ basis: basis.slug, ownerId: user.id, clientName: name, clientEmail: email || undefined, by: staff.name, text: `Added by ${staff.name}` });
  user = await updateUser(user.id, (u) => ({ ...u, applicationIds: [app.id] }));
  const link = await accessLink(user);
  revalidatePath("/admin");

  if (email && form.get("sendEmail") === "on") {
    const res = await sendEmail({ to: email, ...emails.invite(name, link, note || undefined), idempotencyKey: `invite:${user.id}` });
    if (res.ok) return { ok: `Link emailed to ${email}.`, link, linkNote: `${name}'s link:` };
    return { ok: "Client added, but the email wasn't sent.", link, linkNote: emailFailNote(res.reason) };
  }
  return { ok: "Client added.", link, linkNote: `Send ${name} this link:` };
}

/** The client's sign-in link, optionally emailed to them. */
export async function clientAccessLink(appId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { app } = await requireStaffApplication(appId);
  const user = app.ownerId ? await getUser(app.ownerId) : null;
  if (!user) return { error: "This case has no client account yet (it was started before accounts). Ask the client to open their original link." };
  const link = await accessLink(user);
  if (form.get("sendEmail") === "on" && user.email) {
    const res = await sendEmail({ to: user.email, ...emails.invite(user.name, link) });
    if (!res.ok) return { link, linkNote: emailFailNote(res.reason) };
    return { ok: `Emailed to ${user.email}.`, link };
  }
  return { link };
}

/** Kills the client's current link (and signs out any device using it) and issues a new one. */
export async function newClientLink(appId: string): Promise<FormState> {
  const { viewer, app } = await requireStaffApplication(appId);
  if (!app.ownerId) return { error: "This case has no client account." };
  const user = await updateUser(app.ownerId, (u) => ({ ...u, linkVersion: (u.linkVersion ?? 1) + 1, sessionVersion: u.sessionVersion + 1 }));
  await updateApplication(appId, (a) => withActivity(a, viewer.name, "Issued a new client link (old link stopped working)"));
  revalidateCase(appId);
  return { ok: "Old link no longer works.", link: await accessLink(user), linkNote: "New link:" };
}

export async function updateClientName(appId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, app } = await requireStaffApplication(appId);
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Enter the client's name." };
  if (name.length > 120) return { error: "Keep the name to 120 characters or fewer." };
  if (name === app.clientName) return { ok: "No change." };
  if (app.ownerId) await updateUser(app.ownerId, (u) => ({ ...u, name }));
  await updateApplication(appId, (a) => withActivity({ ...a, clientName: name }, viewer.name, `Updated client name to ${name}`));
  revalidateCase(appId);
  revalidatePath("/portal");
  return { ok: "Client name saved." };
}

export async function updateClientContact(appId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, app } = await requireStaffApplication(appId);
  const name = str(form, "name", 120);
  const email = normalizeEmail(str(form, "email"));
  if (!name) return { error: "Enter a name." };
  if (email && !isValidEmail(email)) return { error: "That email address doesn't look right." };
  if (app.ownerId) {
    try {
      await changeUserEmail(app.ownerId, email);
      await updateUser(app.ownerId, (u) => ({ ...u, name }));
    } catch (e) {
      if (e instanceof EmailTakenError) return { error: e.message };
      throw e;
    }
  }
  await updateApplication(appId, (a) => withActivity({ ...a, clientName: name, clientEmail: email || undefined }, viewer.name, `Updated client contact to ${name}${email ? ` <${email}>` : ""}`));
  revalidateCase(appId);
  return { ok: "Saved." };
}

export async function changeBasis(appId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { viewer } = await requireStaffApplication(appId);
  const basis = getBasis(str(form, "basis"));
  if (!basis) return { error: "Choose a basis." };
  await updateApplication(appId, (a) => withActivity({ ...a, basis: basis.slug }, viewer.name, `Changed basis to ${basis.short}`));
  revalidateCase(appId);
  return { ok: "Basis changed. Documents uploaded under items no longer on the checklist are listed under “Other files”." };
}

export async function deleteCase(appId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { app } = await requireStaffApplication(appId);
  if (str(form, "confirm") !== "DELETE") return { error: "Type DELETE to confirm." };
  await deleteApplicationData(appId);
  if (app.ownerId) {
    const user = await getUser(app.ownerId);
    if (user) {
      const remaining = user.applicationIds.filter((id) => id !== appId);
      if (remaining.length === 0 && user.role === "client") await deleteUser(user);
      else await updateUser(user.id, (u) => ({ ...u, applicationIds: remaining }));
    }
  }
  revalidatePath("/admin");
  redirect("/admin?deleted=1");
}

// ---------- Review ----------

export async function reviewDocument(appId: string, docKey: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, app } = await requireStaffApplication(appId);
  const basis = getBasis(app.basis);
  const doc = basis && documentsFor(basis).find((d) => d.key === docKey);
  if (!doc) return { error: "Unknown document." };
  const decision = str(form, "decision");
  const reason = str(form, "reason", 400);
  const note = str(form, "note", 2000);
  const now = new Date().toISOString();
  if (decision === "clear") {
    await updateApplication(appId, (a) => {
      const reviews = { ...a.reviews };
      delete reviews[docKey];
      return withActivity({ ...a, reviews }, viewer.name, `Cleared review: ${documentTitle(doc)}`);
    });
  } else if (decision === "approved" || decision === "issue") {
    if (decision === "issue" && !reason && !note) return { error: "Pick a reason or write a note for the client." };
    if (reason && !(ISSUE_REASONS as readonly string[]).includes(reason)) return { error: "Unknown reason." };
    await updateApplication(appId, (a) =>
      withActivity(
        { ...a, reviews: { ...a.reviews, [docKey]: { status: decision, reason: reason || undefined, note: note || undefined, by: viewer.name, at: now } }, staffActivityAt: now },
        viewer.name,
        decision === "approved" ? `Approved: ${documentTitle(doc)}` : `Flagged: ${documentTitle(doc)} — ${reason || note}`,
      ),
    );
  } else {
    return { error: "Choose approve or flag." };
  }
  revalidateCase(appId);
  return {};
}

/** Email the client a list of everything flagged, and move the case to "Waiting on client". */
export async function sendIssuesToClient(appId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, app } = await requireStaffApplication(appId);
  const basis = getBasis(app.basis);
  if (!basis) return { error: "Unknown basis." };
  const note = str(form, "note", 3000);
  const extra = str(form, "extra", 3000)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const docs = documentsFor(basis);
  const items = docs
    .filter((d) => app.reviews[d.key]?.status === "issue")
    .map((d) => `${documentTitle(d)}: ${[app.reviews[d.key].reason, app.reviews[d.key].note].filter(Boolean).join(" — ")}`);
  if (form.get("includeMissing") === "on") {
    const have = new Set((await listUploads(appId)).map((u) => u.docKey));
    for (const d of docs) if (!d.optional && !have.has(d.key)) items.push(`${documentTitle(d)}: not uploaded yet`);
  }
  items.push(...extra);
  if (items.length === 0 && !note) return { error: "Nothing to send — flag a document, add an item or write a note first." };

  const now = new Date().toISOString();
  const body = `Please look at the following:\n${items.map((i) => `• ${i}`).join("\n")}${note ? `\n\n${note}` : ""}`;
  await updateApplication(appId, (a) =>
    withActivity(
      {
        ...a,
        status: a.status === "further_info" ? "further_info" : "changes_requested",
        messages: [...a.messages, { id: crypto.randomUUID(), from: "staff", authorName: viewer.name, body, at: now }],
        staffActivityAt: now,
        staffSeenAt: now,
      },
      viewer.name,
      `Sent ${items.length} issue(s) to client`,
    ),
  );
  revalidateCase(appId);
  const link = await caseLinkForClient(app);
  if (!app.clientEmail) return { ok: "Saved to the client's message thread (no email on file)." };
  const res = await sendEmail({ to: app.clientEmail, ...emails.issues(app.clientName ?? "there", items, link, note || undefined) });
  if (!res.ok) return { ok: "Saved to the client's message thread, but the email wasn't sent.", link, linkNote: emailFailNote(res.reason) };
  return { ok: `Emailed ${app.clientEmail} and added to their messages.` };
}

// ---------- Case management ----------

export async function setStage(appId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, app } = await requireStaffApplication(appId);
  const stage = str(form, "stage");
  if (!isStage(stage)) return { error: "Unknown stage." };
  if (stage === app.status) return { ok: "No change." };
  const now = new Date().toISOString();
  await updateApplication(appId, (a) =>
    withActivity({ ...a, status: stage, staffActivityAt: now }, viewer.name, `Stage: ${stageInfo(a.status).staff} → ${stageInfo(stage).staff}`),
  );
  revalidateCase(appId);
  if (form.get("notify") === "on" && app.clientEmail) {
    const res = await sendEmail({ to: app.clientEmail, ...emails.stageToClient(app.clientName ?? "there", stageInfo(stage).client, await caseLinkForClient(app)) });
    return res.ok ? { ok: `Stage updated and ${app.clientEmail} notified.` } : { ok: `Stage updated. Email not sent: ${res.reason}.` };
  }
  return { ok: "Stage updated." };
}

const CASE_FIELDS: (keyof CaseInfo)[] = [
  "isdNumber",
  "lodgedOn",
  "acknowledgedOn",
  "vettingDueOn",
  "furtherInfoDueOn",
  "decisionOn",
  "certFeePaidOn",
  "ceremonyOn",
  "feeAgreed",
  "feePaid",
  "nextAction",
  "nextActionDue",
];

export async function updateCaseInfo(appId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { viewer } = await requireStaffApplication(appId);
  const info: CaseInfo = {};
  for (const k of CASE_FIELDS) {
    const v = str(form, k, 300);
    if (v) info[k] = v;
  }
  await updateApplication(appId, (a) => {
    const changed = CASE_FIELDS.filter((k) => (a.caseInfo[k] ?? "") !== (info[k] ?? ""));
    return changed.length ? withActivity({ ...a, caseInfo: info }, viewer.name, `Updated case details (${changed.join(", ")})`) : a;
  });
  revalidateCase(appId);
  return { ok: "Saved." };
}

export async function saveStaffNotes(appId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireStaffApplication(appId);
  const notes = str(form, "notes", 20000);
  await updateApplication(appId, (a) => ({ ...a, staffNotes: notes }));
  revalidatePath(`/admin/cases/${appId}`);
  return { ok: "Notes saved." };
}
