import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton, PrintButton } from "@/components/forms";
import { fmtDate, fmtSize } from "@/components/ui";
import { buildChecklist } from "@/lib/checklist";
import { packEntries } from "@/lib/pack";
import { absenceByYear, isShown, sectionsFor } from "@/lib/questionnaire";
import { requireStaffApplication } from "@/lib/session";
import { listUploads, type Answers } from "@/lib/store";

export const metadata: Metadata = { title: "Form 8 transcription sheet — JT Immigration", robots: { index: false, follow: false } };

// Read-only answers laid out in the same order as the ISD online form, with copy buttons,
// so the application can be keyed into the portal with the client present.
export default async function SheetPage({ params }: PageProps<"/admin/cases/[id]/sheet">) {
  const { id } = await params;
  const { app: stored } = await requireStaffApplication(id);
  const app = { ...stored, answers: { email: stored.clientEmail ?? "", ...stored.answers } as Answers };
  const cl = buildChecklist(app, await listUploads(id));
  const entries = cl ? packEntries(cl, app.clientName ?? "") : [];
  const sections = sectionsFor(app.basis);
  const trips = Array.isArray(app.answers.trips) ? app.answers.trips : [];
  const years = absenceByYear(trips);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 text-sm print:max-w-none print:px-0 print:py-0">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/admin/cases/${id}`} className="text-emerald-700 hover:underline">
          ← Back to case
        </Link>
        <div className="flex gap-2">
          <a href={`/admin/cases/${id}/download`} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            ⬇ Download documents (ZIP)
          </a>
          <PrintButton />
        </div>
      </div>

      <h1 className="mt-4 text-2xl font-semibold text-navy">{app.clientName ?? "Applicant"} — naturalisation (Form 8)</h1>
      <p className="mt-1 text-slate-500">
        {cl?.basis.short} · Ref {id.slice(0, 8).toUpperCase()} · printed {fmtDate(new Date().toISOString())}
      </p>

      <div className="mt-4 rounded-md bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200 print:hidden">
        <p className="font-medium">Lodging checklist</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          <li>The client signs in to (or registers) their <strong>own</strong> account on the ISD Online Forms Portal (inisonline.jahs.ie), using their own email — all ISD letters, vetting links and the ceremony invite go there.</li>
          <li>Key in the answers below section by section; upload each file from the ZIP into its slot (PDF/JPEG, under 5 MB each).</li>
          <li>The client reviews every answer, ticks the declaration themselves and pays the €175 fee with their own card.</li>
          <li>Before submitting, save a PDF/screenshots of the completed form — it can&apos;t be viewed or edited after.</li>
          <li>Record the lodging date and (later) the application number on the case page. Spouse route: the Irish spouse swears STATDEC-13A on or after the lodging date.</li>
        </ol>
      </div>

      {sections.map((section) => (
        <section key={section.id} className="mt-6 break-inside-avoid-page">
          <h2 className="border-b border-slate-300 pb-1 text-base font-semibold text-navy">{section.title}</h2>
          <table className="mt-1 w-full">
            <tbody>
              {section.questions.filter((q) => isShown(q, app.answers)).map((q) => {
                const v = app.answers[q.id];
                if (q.type === "list") {
                  const rows = Array.isArray(v) ? v : [];
                  return (
                    <tr key={q.id} className="border-b border-slate-100 align-top">
                      <td className="w-14 py-1.5 pr-2 font-mono text-xs text-slate-400">{q.form8 ?? ""}</td>
                      <td colSpan={2} className="py-1.5">
                        <p className="text-slate-600">{q.label}</p>
                        {rows.length === 0 ? (
                          <p className="text-slate-400">None given</p>
                        ) : (
                          <table className="mt-1 w-full text-xs">
                            <thead>
                              <tr className="text-left text-slate-500">
                                {q.fields.map((f) => (
                                  <th key={f.id} className="pr-2 font-medium">
                                    {f.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r, i) => (
                                <tr key={i}>
                                  {q.fields.map((f) => (
                                    <td key={f.id} className="pr-2 text-slate-900">
                                      {r[f.id] || "—"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {q.id === "trips" && (
                          <p className="mt-1 text-xs text-slate-500">Days abroad: {years.map((y) => `${y.year === 1 ? "last 12 months" : `year ${y.year}`} ${y.days}`).join(" · ")}</p>
                        )}
                      </td>
                    </tr>
                  );
                }
                const text = typeof v === "string" ? v : "";
                return (
                  <tr key={q.id} className="border-b border-slate-100 align-top">
                    <td className="w-14 py-1.5 pr-2 font-mono text-xs text-slate-400">{q.form8 ?? ""}</td>
                    <td className="w-1/2 py-1.5 pr-3 text-slate-600">{q.label}</td>
                    <td className="py-1.5">
                      <span className="flex items-start justify-between gap-2">
                        <span className={`whitespace-pre-wrap ${text ? "font-medium text-slate-900" : "text-red-600"}`}>{text || (q.required ? "MISSING" : "—")}</span>
                        {text && <CopyButton value={text} />}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      <section className="mt-8 break-before-page">
        <h2 className="border-b border-slate-300 pb-1 text-base font-semibold text-navy">Supporting documents (file names in the ZIP)</h2>
        {cl && (
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1 pr-2 font-medium">Checklist item</th>
                <th className="py-1 pr-2 font-medium">Status</th>
                <th className="py-1 font-medium">File(s)</th>
              </tr>
            </thead>
            <tbody>
              {cl.items.map((item) => {
                const files = entries.filter((e) => item.files.some((f) => f.path === e.path));
                if (item.doc.optional && files.length === 0) return null;
                return (
                  <tr key={item.doc.key} className="border-t border-slate-100 align-top">
                    <td className="py-1 pr-2">{item.title}</td>
                    <td className={`py-1 pr-2 ${item.state === "approved" ? "text-emerald-700" : "font-medium text-red-700"}`}>{item.state === "approved" ? "Approved" : item.state.toUpperCase()}</td>
                    <td className="py-1">
                      {files.length === 0
                        ? "—"
                        : files.map((f) => (
                            <div key={f.path} className={f.size > 5 * 1024 * 1024 ? "text-amber-700" : ""}>
                              {f.name.split("/").pop()} ({fmtSize(f.size)}
                              {f.size > 5 * 1024 * 1024 ? " — over 5 MB, compress before upload" : ""})
                            </div>
                          ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
