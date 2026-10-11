import type { Metadata } from "next";
import Link from "next/link";
import { StageBadge, fmtDate, fmtDateTime, now } from "@/components/ui";
import { buildChecklist } from "@/lib/checklist";
import { questionnaireProgress } from "@/lib/questionnaire";
import { requireStaff } from "@/lib/session";
import { ACTIVE, STAGES } from "@/lib/status";
import { listAllUploads, listApplications, type Application } from "@/lib/store";

export const metadata: Metadata = { title: "Cases — JT Immigration", robots: { index: false, follow: false } };

const DAY = 86_400_000;

function needsAttention(a: Application) {
  return a.status === "submitted" || (!!a.clientActivityAt && (!a.staffSeenAt || a.clientActivityAt > a.staffSeenAt));
}

function deadlines(a: Application) {
  const out: { label: string; date: string }[] = [];
  const c = a.caseInfo;
  if (c.furtherInfoDueOn && a.status === "further_info") out.push({ label: "ISD info due", date: c.furtherInfoDueOn });
  if (c.vettingDueOn) out.push({ label: "Vetting due", date: c.vettingDueOn });
  if (c.nextActionDue) out.push({ label: c.nextAction || "Next action", date: c.nextActionDue });
  if (c.ceremonyOn) out.push({ label: "Ceremony", date: c.ceremonyOn });
  const irp = typeof a.answers.irpExpiry === "string" ? a.answers.irpExpiry : "";
  if (irp && ACTIVE.includes(a.status)) out.push({ label: "IRP expires", date: irp });
  return out;
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  await requireStaff();
  const sp = await searchParams;
  const view = typeof sp.view === "string" ? sp.view : "attention";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const [apps, uploads] = await Promise.all([listApplications(), listAllUploads()]);
  const rows = apps.map((app) => {
    const cl = buildChecklist(app, uploads.get(app.id) ?? []);
    const qp = questionnaireProgress(app.basis, app.answers);
    return { app, cl, qp, attention: needsAttention(app), deadlines: deadlines(app) };
  });

  const counts: Record<string, number> = {
    attention: rows.filter((r) => r.attention).length,
    active: rows.filter((r) => ACTIVE.includes(r.app.status)).length,
    all: rows.length,
  };
  for (const s of STAGES) counts[s.key] = rows.filter((r) => r.app.status === s.key).length;

  let shown = rows.filter((r) =>
    view === "attention" ? r.attention : view === "active" ? ACTIVE.includes(r.app.status) : view === "all" ? true : r.app.status === view,
  );
  if (q) {
    shown = rows.filter((r) =>
      [r.app.clientName, r.app.clientEmail, r.app.id, r.app.caseInfo.isdNumber, typeof r.app.answers.phone === "string" ? r.app.answers.phone : ""]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }

  const soon = now() + 30 * DAY;
  const upcoming = rows
    .flatMap((r) => r.deadlines.map((d) => ({ ...d, app: r.app })))
    .filter((d) => Date.parse(d.date) <= soon)
    .sort((a, b) => a.date.localeCompare(b.date));

  const tabs = [
    { key: "attention", label: "Needs attention" },
    { key: "active", label: "All active" },
    ...STAGES.map((s) => ({ key: s.key, label: s.staff })),
    { key: "all", label: "Everything" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-navy">Cases</h1>
        <div className="flex flex-wrap items-center gap-2">
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Search name, email, ISD no., phone" className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Search</button>
          </form>
          <Link href="/admin/invite" className="rounded-md bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-800">
            + Add client
          </Link>
        </div>
      </div>

      {sp.deleted && <p className="mt-4 rounded-md bg-slate-100 p-3 text-sm text-slate-700">Case deleted.</p>}

      {upcoming.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <h2 className="text-sm font-semibold text-amber-900">Deadlines in the next 30 days (and overdue)</h2>
          <ul className="mt-1 grid gap-x-6 gap-y-0.5 text-sm text-amber-900 sm:grid-cols-2">
            {upcoming.map((d, i) => (
              <li key={i}>
                <span className={Date.parse(d.date) < now() ? "font-semibold text-red-700" : ""}>{fmtDate(d.date)}</span> · {d.label} ·{" "}
                <Link href={`/admin/cases/${d.app.id}`} className="underline">
                  {d.app.clientName ?? d.app.id.slice(0, 8)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!q && (
        <div className="mt-4 flex flex-wrap gap-1 text-sm">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/admin?view=${t.key}`}
              className={`rounded-md px-2.5 py-1 ${view === t.key ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-100"} ${counts[t.key] === 0 && view !== t.key ? "opacity-50" : ""}`}
            >
              {t.label} <span className="text-xs opacity-75">{counts[t.key]}</span>
            </Link>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {q ? "No cases match your search." : view === "attention" ? "Nothing needs your attention right now." : "No cases here."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Documents (required)</th>
                <th className="px-3 py-2 font-medium">Questions</th>
                <th className="px-3 py-2 font-medium">Last client activity</th>
                <th className="px-3 py-2 font-medium">Next date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {shown.map(({ app, cl, qp, attention, deadlines: dl }) => (
                <tr key={app.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Link href={`/admin/cases/${app.id}`} className="font-medium text-emerald-700 hover:underline">
                      {attention && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-blue-600" title="New activity" />}
                      {app.clientName ?? `Draft ${app.id.slice(0, 8).toUpperCase()}`}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {app.clientEmail ?? "no email"} · {cl?.basis.short ?? app.basis}
                      {!app.ownerId && " · no account"}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <StageBadge stage={app.status} />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {cl ? (
                      <span className="flex flex-wrap gap-1">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5">
                          {cl.uploaded}/{cl.required.length} in
                        </span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">{cl.approved} ok</span>
                        {cl.awaitingReview.length > 0 && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800">{cl.awaitingReview.length} to review</span>}
                        {cl.issues.length > 0 && <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-800">{cl.issues.length} issues</span>}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {qp.complete}/{qp.total}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{fmtDateTime(app.clientActivityAt)}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {dl.length ? (
                      <>
                        {fmtDate(dl.sort((a, b) => a.date.localeCompare(b.date))[0].date)} <span className="text-slate-400">{dl[0].label}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
