"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { saveSection } from "@/app/application/[id]/actions";
import { absenceByYear, isShown, missingInSection, permissionGaps, type Field, type Question, type Section } from "@/lib/questionnaire";

type Answers = Record<string, string | Record<string, string>[]>;

const input =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-slate-50 disabled:text-slate-600";

export function QuestionnaireForm({
  appId,
  section,
  initial,
  nextHref,
  readOnly,
}: {
  appId: string;
  section: Section;
  initial: Answers;
  nextHref?: string;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ ok?: string; error?: string }>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (id: string, value: Answers[string]) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setDirty(true);
    setStatus({});
  };

  function save(goNext: boolean) {
    startTransition(async () => {
      const res = await saveSection(appId, section.id, JSON.stringify(answers));
      setStatus(res);
      if (!res.error) {
        setDirty(false);
        if (goNext && nextHref) router.push(nextHref);
        else router.refresh();
      }
    });
  }

  const missing = new Set(missingInSection(section, answers).map((q) => q.id));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(true);
      }}
      className="space-y-5"
    >
      {section.questions.filter((q) => isShown(q, answers)).map((q) => (
        <div key={q.id}>
          {q.type === "list" ? (
            <ListInput q={q} rows={(answers[q.id] as Record<string, string>[]) ?? []} onChange={(rows) => set(q.id, rows)} readOnly={readOnly} flagged={missing.has(q.id)} />
          ) : (
            <FieldInput f={q} value={(answers[q.id] as string) ?? ""} onChange={(v) => set(q.id, v)} readOnly={readOnly} flagged={missing.has(q.id)} />
          )}
          {q.id === "trips" && <AbsenceSummary trips={(answers.trips as Record<string, string>[]) ?? []} />}
          {q.id === "permissions" && <GapSummary perms={(answers.permissions as Record<string, string>[]) ?? []} />}
        </div>
      ))}

      {!readOnly && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3">
          <button type="button" disabled={pending} onClick={() => save(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
          {nextHref && (
            <button type="submit" disabled={pending} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
              Save &amp; continue →
            </button>
          )}
          {status.ok && !dirty && <span className="text-sm text-emerald-700">✓ {status.ok}</span>}
          {status.error && <span className="text-sm text-red-600">{status.error}</span>}
          {dirty && !pending && <span className="text-xs text-amber-700">Unsaved changes</span>}
        </div>
      )}
    </form>
  );
}

function FieldInput({ f, value, onChange, readOnly, flagged, compact }: { f: Field; value: string; onChange: (v: string) => void; readOnly: boolean; flagged?: boolean; compact?: boolean }) {
  const control = (() => {
    const common = { disabled: readOnly, className: input, "aria-label": compact ? f.label : undefined };
    switch (f.type) {
      case "textarea":
        return <textarea rows={3} value={value} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} {...common} />;
      case "select":
        return (
          <select value={value} onChange={(e) => onChange(e.target.value)} {...common}>
            <option value="">{f.options?.[0] === "" ? "—" : "Choose…"}</option>
            {f.options?.filter(Boolean).map((o) => <option key={o}>{o}</option>)}
          </select>
        );
      case "yesno":
        return (
          <div className="mt-1 flex gap-2">
            {["Yes", "No"].map((o) => (
              <label key={o} className={`cursor-pointer rounded-md border px-4 py-1.5 text-sm ${value === o ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-800" : "border-slate-300 text-slate-700"} ${readOnly ? "cursor-default opacity-70" : ""}`}>
                <input type="radio" className="sr-only" checked={value === o} disabled={readOnly} onChange={() => onChange(o)} />
                {o}
              </label>
            ))}
          </div>
        );
      default:
        return <input type={f.type} value={value} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} {...common} />;
    }
  })();
  if (compact) return control;
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="flex flex-wrap items-baseline gap-x-2">
        {f.label}
        {f.required && <span className="text-red-500">*</span>}
        {flagged && <span className="text-xs font-normal text-amber-700">needs an answer</span>}
      </span>
      {f.help && <span className="mt-0.5 block text-xs font-normal text-slate-500">{f.help}</span>}
      {control}
    </label>
  );
}

function ListInput({ q, rows, onChange, readOnly, flagged }: { q: Extract<Question, { type: "list" }>; rows: Record<string, string>[]; onChange: (rows: Record<string, string>[]) => void; readOnly: boolean; flagged?: boolean }) {
  const shown = rows.length ? rows : readOnly ? [] : [{}];
  const update = (i: number, key: string, v: string) => onChange(shown.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">
        {q.label} {flagged && <span className="text-xs font-normal text-amber-700">needs at least one entry</span>}
      </legend>
      {q.help && <p className="mt-0.5 text-xs text-slate-500">{q.help}</p>}
      <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              {q.fields.map((f) => (
                <th key={f.id} className="px-2 py-1.5 font-medium">
                  {f.label}
                </th>
              ))}
              {!readOnly && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={q.fields.length} className="px-2 py-2 text-slate-400">
                  None
                </td>
              </tr>
            )}
            {shown.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 align-top">
                {q.fields.map((f) => (
                  <td key={f.id} className="px-1 py-1">
                    <FieldInput f={f} value={row[f.id] ?? ""} onChange={(v) => update(i, f.id, v)} readOnly={readOnly} compact />
                  </td>
                ))}
                {!readOnly && (
                  <td className="px-1 py-2">
                    <button type="button" title="Remove row" onClick={() => onChange(shown.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600">
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button type="button" onClick={() => onChange([...shown, {}])} className="mt-2 rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50">
          + {q.addLabel ?? "Add row"}
        </button>
      )}
    </fieldset>
  );
}

function AbsenceSummary({ trips }: { trips: Record<string, string>[] }) {
  const years = absenceByYear(trips);
  return (
    <div className="mt-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
      <p className="font-medium text-slate-700">Days outside Ireland (not counting travel days):</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {years.map((y) => (
          <span key={y.year} className={y.year === 1 && y.days > 100 ? "font-semibold text-red-700" : y.days > 70 ? "font-semibold text-amber-700" : ""}>
            {y.year === 1 ? "Last 12 months" : `Year ${y.year}`}: {y.days}
          </span>
        ))}
      </div>
      {years[0].days > 100 && <p className="mt-1 text-red-700">Over 100 days in the last 12 months — you can&apos;t apply until this drops. JT Immigration will advise on timing.</p>}
      {years[0].days > 70 && years[0].days <= 100 && <p className="mt-1 text-amber-700">Over 70 days — please explain the reasons below.</p>}
    </div>
  );
}

function GapSummary({ perms }: { perms: Record<string, string>[] }) {
  const gaps = permissionGaps(perms);
  if (!gaps.length) return null;
  return (
    <p className="mt-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
      Possible gap{gaps.length > 1 ? "s" : ""} in permission:{" "}
      {gaps.map((g) => `${g.days} day${g.days > 1 ? "s" : ""} between ${g.after} and ${g.before}`).join("; ")}. Time without permission doesn&apos;t count — double-check these dates against your cards and letters.
    </p>
  );
}
