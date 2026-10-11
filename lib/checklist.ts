import { SECTIONS, docState, documentTitle, documentsFor, getBasis, type Basis, type DocState, type DocumentRequirement } from "./citizenship";
import type { Application, Review, UploadedFile } from "./store";

export type ChecklistItem = {
  doc: DocumentRequirement;
  title: string;
  files: UploadedFile[];
  review?: Review;
  state: DocState;
};

export type Checklist = {
  basis: Basis;
  items: ChecklistItem[];
  required: ChecklistItem[];
  /** Required items with at least one file. */
  uploaded: number;
  approved: number;
  issues: ChecklistItem[];
  missing: ChecklistItem[];
  awaitingReview: ChecklistItem[];
  /** Uploads under keys that are no longer on the checklist (e.g. basis changed). */
  orphans: UploadedFile[];
};

export function buildChecklist(app: Application, uploads: UploadedFile[]): Checklist | null {
  const basis = getBasis(app.basis);
  if (!basis) return null;
  const byDoc = new Map<string, UploadedFile[]>();
  for (const u of uploads) byDoc.set(u.docKey, [...(byDoc.get(u.docKey) ?? []), u]);
  const docs = documentsFor(basis);
  const items = docs.map((doc) => {
    const files = byDoc.get(doc.key) ?? [];
    const review = app.reviews[doc.key];
    return { doc, title: documentTitle(doc), files, review, state: docState(files, review) };
  });
  const required = items.filter((i) => !i.doc.optional);
  const known = new Set(docs.map((d) => d.key));
  return {
    basis,
    items,
    required,
    uploaded: required.filter((i) => i.files.length > 0).length,
    approved: required.filter((i) => i.state === "approved").length,
    issues: items.filter((i) => i.state === "issue"),
    missing: required.filter((i) => i.state === "missing"),
    awaitingReview: items.filter((i) => i.state === "uploaded" || i.state === "reuploaded"),
    orphans: uploads.filter((u) => !known.has(u.docKey)),
  };
}

/** Group items by checklist section and sub-group for display. */
export function groupItems(items: ChecklistItem[], basis: Basis) {
  return SECTIONS.map((section) => {
    const sectionItems = items.filter((i) => i.doc.section === section.key);
    const groups: { name?: string; items: ChecklistItem[] }[] = [];
    for (const i of sectionItems) {
      const last = groups.at(-1);
      if (last && last.name === i.doc.group) last.items.push(i);
      else groups.push({ name: i.doc.group, items: [i] });
    }
    const title = section.key === "basis" ? (basis.basisSectionTitle ?? section.title) : section.title;
    return { key: section.key, title, intro: section.intro, groups, count: sectionItems.length };
  }).filter((s) => s.count > 0);
}
