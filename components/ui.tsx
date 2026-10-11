import Link from "next/link";
import { DOC_STATE_LABEL, type DocState } from "@/lib/citizenship";
import { TONE_CLASSES, stageInfo } from "@/lib/status";

export const inputCls =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";
export const labelCls = "block text-sm font-medium text-slate-700";
export const btnPrimary =
  "inline-flex items-center justify-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50";
export const btnSecondary =
  "inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50";
export const btnDanger =
  "inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50";
export const card = "rounded-lg border border-slate-200 bg-white";

export function StageBadge({ stage, audience = "staff" }: { stage: string; audience?: "staff" | "client" }) {
  const s = stageInfo(stage);
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[s.tone]}`}>
      {audience === "staff" ? s.staff : s.client}
    </span>
  );
}

const DOC_TONE: Record<DocState, string> = {
  missing: "bg-slate-100 text-slate-600",
  uploaded: "bg-blue-100 text-blue-800",
  reuploaded: "bg-blue-100 text-blue-800",
  approved: "bg-emerald-100 text-emerald-800",
  issue: "bg-red-100 text-red-800",
};

export function DocBadge({ state }: { state: DocState }) {
  return <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${DOC_TONE[state]}`}>{DOC_STATE_LABEL[state]}</span>;
}

export function PageHeader({ title, sub, back, children }: { title: string; sub?: React.ReactNode; back?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="text-sm text-emerald-700 hover:underline">
          ← {back.label}
        </Link>
      )}
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{title}</h1>
          {sub && <div className="mt-1 text-sm text-slate-500">{sub}</div>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

/** Request-time clock for server components (they render once per request). */
export const now = () => Date.now();

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Dublin" })
    : "—";
export const fmtSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
