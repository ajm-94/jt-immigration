import "server-only";
import { deletePaths, getJson, listPaths, putJson, updateJson } from "./blobdb";
import type { Stage } from "./status";

export type Answers = Record<string, string | Record<string, string>[]>;

export type Review = {
  status: "approved" | "issue";
  reason?: string;
  note?: string;
  by: string;
  at: string;
};

export type Message = { id: string; from: "client" | "staff"; authorName: string; body: string; at: string };

export type Activity = { at: string; by: string; text: string };

export type CaseInfo = {
  isdNumber?: string;
  lodgedOn?: string;
  acknowledgedOn?: string;
  vettingDueOn?: string;
  furtherInfoDueOn?: string;
  decisionOn?: string;
  certFeePaidOn?: string;
  ceremonyOn?: string;
  feeAgreed?: string;
  feePaid?: string;
  nextAction?: string;
  nextActionDue?: string;
};

/** Contact details captured by the first version of the site (before the full questionnaire). */
export type LegacyDetails = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  daysAbroad?: string;
  notes?: string;
};

export type Application = {
  id: string;
  basis: string;
  status: Stage;
  ownerId?: string;
  clientName?: string;
  clientEmail?: string;
  answers: Answers;
  reviews: Record<string, Review>;
  messages: Message[];
  activity: Activity[];
  caseInfo: CaseInfo;
  staffNotes?: string;
  details?: LegacyDetails;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  /** Last time the client did something staff should look at (upload, message, submit). */
  clientActivityAt?: string;
  /** Last time a staff member opened the case. */
  staffSeenAt?: string;
  /** Last time staff did something the client should look at (review, message, stage change). */
  staffActivityAt?: string;
  clientSeenAt?: string;
};

export type UploadedFile = { path: string; docKey: string; filename: string; size: number; uploadedAt: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isValidId = (id: string) => UUID_RE.test(id);

const appPath = (id: string) => `applications/${id}.json`;
export const uploadPrefix = (id: string) => `uploads/${id}/`;

export async function createApplication(input: {
  basis: string;
  ownerId?: string;
  clientName?: string;
  clientEmail?: string;
  by: string;
  text: string;
}) {
  const now = new Date().toISOString();
  const app: Application = {
    id: crypto.randomUUID(),
    basis: input.basis,
    status: "collecting",
    ownerId: input.ownerId,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    answers: {},
    reviews: {},
    messages: [],
    activity: [{ at: now, by: input.by, text: input.text }],
    caseInfo: {},
    createdAt: now,
    updatedAt: now,
  };
  return putJson(appPath(app.id), app);
}

export async function getApplication(id: string): Promise<Application | null> {
  if (!isValidId(id)) return null;
  const raw = await getJson<Record<string, unknown>>(appPath(id));
  return raw ? normalize(raw) : null;
}

/** Atomic read-modify-write of an application (safe when staff and client act at the same time). */
export async function updateApplication(id: string, mutate: (app: Application) => Application) {
  return updateJson<Record<string, unknown>>(appPath(id), (raw) => {
    const next = mutate(normalize(raw));
    return { ...next, updatedAt: new Date().toISOString() };
  }) as unknown as Promise<Application>;
}

export function withActivity(app: Application, by: string, text: string): Application {
  return { ...app, activity: [{ at: new Date().toISOString(), by, text }, ...app.activity].slice(0, 300) };
}

/** Upgrade records written by earlier versions of the site. */
function normalize(raw: Record<string, unknown>): Application {
  const r = raw as Partial<Application> & Record<string, unknown>;
  if ("category" in r && !("basis" in r)) {
    // v0: details were stored up front under a visa `category`.
    const legacy = raw as { id: string; category: string; fullName: string; email: string; phone: string; nationality: string; countryOfResidence: string; notes?: string; createdAt: string };
    return normalize({
      id: legacy.id,
      basis: legacy.category === "citizenship" ? "standard" : legacy.category,
      status: "draft",
      details: {
        fullName: legacy.fullName,
        email: legacy.email,
        phone: legacy.phone,
        dateOfBirth: "",
        nationality: legacy.nationality,
        address: legacy.countryOfResidence,
        notes: legacy.notes,
      },
      createdAt: legacy.createdAt,
      updatedAt: legacy.createdAt,
    });
  }
  const status = (r.status as string) === "draft" ? "collecting" : ((r.status as Stage) ?? "collecting");
  const details = r.details as LegacyDetails | undefined;
  return {
    ...(r as Application),
    status,
    answers: r.answers ?? {},
    reviews: r.reviews ?? {},
    messages: r.messages ?? [],
    activity: r.activity ?? [],
    caseInfo: r.caseInfo ?? {},
    clientName: r.clientName ?? details?.fullName,
    clientEmail: r.clientEmail ?? details?.email,
    clientActivityAt: r.clientActivityAt ?? (r.submittedAt as string | undefined),
  };
}

export async function listApplications(): Promise<Application[]> {
  const blobs = await listPaths("applications/");
  const apps = await Promise.all(
    blobs.map((b) => getApplication(b.path.replace(/^applications\//, "").replace(/\.json$/, ""))),
  );
  return apps
    .filter((a): a is Application => a !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function toUpload(b: { path: string; size: number; uploadedAt: Date }): UploadedFile | null {
  const [root, , docKey, ...rest] = b.path.split("/");
  if (root !== "uploads" || !docKey || rest.length === 0) return null;
  return { path: b.path, docKey, filename: rest.join("/"), size: b.size, uploadedAt: b.uploadedAt.toISOString() };
}

export async function listUploads(id: string): Promise<UploadedFile[]> {
  const blobs = await listPaths(uploadPrefix(id));
  return blobs
    .map(toUpload)
    .filter((u): u is UploadedFile => !!u)
    .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
}

/** One list call for every upload, grouped by application id (for the staff dashboard). */
export async function listAllUploads(): Promise<Map<string, UploadedFile[]>> {
  const map = new Map<string, UploadedFile[]>();
  for (const b of await listPaths("uploads/")) {
    const u = toUpload(b);
    if (!u) continue;
    const id = b.path.split("/")[1];
    map.set(id, [...(map.get(id) ?? []), u]);
  }
  return map;
}

export async function deleteUpload(path: string) {
  await deletePaths([path]);
}

export async function deleteApplicationData(id: string) {
  const uploads = await listPaths(uploadPrefix(id));
  await deletePaths([...uploads.map((u) => u.path), appPath(id)]);
}
