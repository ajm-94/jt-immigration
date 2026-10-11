import { SECTIONS } from "./citizenship";
import type { Checklist } from "./checklist";

const clean = (s: string) => s.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 90);

/**
 * File names for the lodging pack, following ISD's advice to name files by content and owner,
 * e.g. "01 Identity/Jane Doe - Certified copy of your passport photo page.pdf".
 */
export function packEntries(cl: Checklist, clientName: string) {
  const owner = clean(clientName || "Applicant");
  const used = new Set<string>();
  const entries: { path: string; name: string; size: number; uploadedAt: string; docTitle: string }[] = [];
  const unique = (name: string) => {
    let n = name;
    for (let i = 2; used.has(n.toLowerCase()); i++) n = name.replace(/(\.[^./]*)?$/, ` (${i})$1`);
    used.add(n.toLowerCase());
    return n;
  };
  for (const item of cl.items) {
    const sectionIndex = SECTIONS.findIndex((s) => s.key === item.doc.section) + 1;
    const sectionTitle = SECTIONS[sectionIndex - 1]?.title ?? "Other";
    const folder = `${String(sectionIndex).padStart(2, "0")} ${clean(sectionTitle)}`;
    item.files.forEach((f, i) => {
      const ext = (f.filename.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? "").toLowerCase();
      const part = item.files.length > 1 ? ` - part ${i + 1}` : "";
      entries.push({ path: f.path, name: unique(`${folder}/${owner} - ${clean(item.title.replace(" (whichever applies)", ""))}${part}${ext}`), size: f.size, uploadedAt: f.uploadedAt, docTitle: item.title });
    });
  }
  for (const f of cl.orphans) entries.push({ path: f.path, name: unique(`99 Other/${clean(f.docKey)} - ${clean(f.filename)}`), size: f.size, uploadedAt: f.uploadedAt, docTitle: f.docKey });
  return entries;
}
