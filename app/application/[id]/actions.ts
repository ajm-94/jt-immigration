"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { FormState } from "@/components/forms";
import { documentTitle, documentsFor, getBasis } from "@/lib/citizenship";
import { emails, sendEmail } from "@/lib/email";
import { caseLinkForClient, notifyStaff } from "@/lib/notify";
import { cleanSectionAnswers, sectionsFor } from "@/lib/questionnaire";
import { requireApplication } from "@/lib/session";
import { CLIENT_EDITABLE } from "@/lib/status";
import { deleteUpload, updateApplication, uploadPrefix, withActivity, type Application } from "@/lib/store";

const canClientEdit = (app: Application) => CLIENT_EDITABLE.includes(app.status);

function revalidateCase(id: string) {
  revalidatePath(`/application/${id}`);
  revalidatePath(`/admin/cases/${id}`);
}

function docLabel(app: Application, docKey: string) {
  const basis = getBasis(app.basis);
  const doc = basis && documentsFor(basis).find((d) => d.key === docKey);
  return doc ? documentTitle(doc) : docKey;
}

/** Called by the browser after a direct-to-Blob upload finishes, so the case log and staff queue update. */
export async function recordUpload(applicationId: string, docKey: string, filenames: string[]) {
  const { viewer, app } = await requireApplication(applicationId);
  const label = docLabel(app, docKey);
  const names = filenames.slice(0, 20).map((f) => String(f).slice(0, 100)).join(", ");
  const now = new Date().toISOString();
  await updateApplication(app.id, (a) => {
    const next = withActivity(a, viewer.name, `Uploaded ${names} → ${label}`);
    return viewer.role === "staff" ? next : { ...next, clientActivityAt: now };
  });
  revalidateCase(app.id);
}

export async function removeFile(applicationId: string, path: string) {
  const { viewer, app } = await requireApplication(applicationId);
  if (!path.startsWith(uploadPrefix(app.id)) || path.includes("..")) throw new Error("Invalid file");
  if (viewer.role !== "staff" && !canClientEdit(app)) throw new Error("This application is locked. Please message JT Immigration.");
  await deleteUpload(path);
  const [, , docKey, ...rest] = path.split("/");
  await updateApplication(app.id, (a) => withActivity(a, viewer.name, `Removed ${rest.join("/")} from ${docLabel(app, docKey)}`));
  revalidateCase(app.id);
}

export async function saveSection(applicationId: string, sectionId: string, json: string): Promise<FormState> {
  const { viewer, app } = await requireApplication(applicationId);
  if (viewer.role !== "staff" && !canClientEdit(app)) return { error: "Your answers are locked because the application has been lodged. Message JT Immigration if something changed." };
  const section = sectionsFor(app.basis).find((s) => s.id === sectionId);
  if (!section) return { error: "Unknown section." };
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(json);
  } catch {
    return { error: "Couldn't read your answers. Please try again." };
  }
  const cleaned = cleanSectionAnswers(section, input);
  const now = new Date().toISOString();
  await updateApplication(app.id, (a) => {
    const answers = { ...a.answers, ...cleaned };
    const name = [answers.firstNames, answers.lastName].filter((x) => typeof x === "string" && x).join(" ");
    let next: Application = { ...a, answers, clientName: name || a.clientName };
    // Log at most one "updated answers" entry per section per hour to keep the log readable.
    const recent = a.activity.find((x) => x.text === `Updated answers: ${section.title}` && Date.now() - Date.parse(x.at) < 3600_000);
    if (!recent) next = withActivity(next, viewer.name, `Updated answers: ${section.title}`);
    return viewer.role === "staff" ? next : { ...next, clientActivityAt: now };
  });
  revalidateCase(app.id);
  return { ok: "Saved." };
}

export async function submitForReview(applicationId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, app } = await requireApplication(applicationId);
  if (viewer.role === "staff") return { error: "Staff can't submit on the client's behalf — change the stage instead." };
  if (!["collecting", "changes_requested", "further_info"].includes(app.status)) return { error: "This application is already with JT Immigration." };
  if (form.get("declaration") !== "on") return { error: "Please tick the declaration to continue." };
  const now = new Date().toISOString();
  const first = !app.submittedAt;
  await updateApplication(app.id, (a) =>
    withActivity(
      { ...a, status: "submitted", submittedAt: a.submittedAt ?? now, clientActivityAt: now },
      viewer.name,
      first ? "Client submitted the application for review" : "Client sent the application back for review",
    ),
  );
  after(() => notifyStaff(app.id, `${first ? "Submitted" : "Re-submitted"} for review: ${app.clientName ?? viewer.name}`, `${viewer.name} has ${first ? "submitted their application" : "sent their application back"} for review.`));
  revalidateCase(app.id);
  return { ok: "Sent to JT Immigration. We'll review everything and get back to you." };
}

export async function sendMessage(applicationId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, app } = await requireApplication(applicationId);
  const body = String(form.get("body") ?? "").trim().slice(0, 5000);
  if (!body) return { error: "Please write a message." };
  const now = new Date().toISOString();
  const fromStaff = viewer.role === "staff";
  await updateApplication(app.id, (a) => ({
    ...a,
    messages: [...a.messages, { id: crypto.randomUUID(), from: fromStaff ? "staff" : "client", authorName: viewer.name, body, at: now }],
    ...(fromStaff ? { staffActivityAt: now, staffSeenAt: now } : { clientActivityAt: now, clientSeenAt: now }),
  }));
  if (fromStaff) {
    const link = await caseLinkForClient(app);
    if (app.clientEmail) after(() => sendEmail({ to: app.clientEmail!, ...emails.messageToClient(app.clientName ?? "there", link) }).then(() => {}));
  } else {
    after(() => notifyStaff(app.id, `Message from ${viewer.name}`, `${viewer.name} wrote:\n\n${body.slice(0, 1000)}`));
  }
  revalidateCase(app.id);
  return { ok: fromStaff ? "Message sent." : "Message sent to JT Immigration." };
}
