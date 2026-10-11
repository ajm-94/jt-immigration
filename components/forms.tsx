"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

export type FormState = { error?: string; ok?: string; link?: string; linkNote?: string };
type Action = (prev: FormState, form: FormData) => Promise<FormState>;

/** A form bound to a server action: shows pending state, errors, success text and copyable links. */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Saving…",
  className = "space-y-4",
  buttonClass = "inline-flex items-center justify-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50",
  confirm,
}: {
  action: Action;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  buttonClass?: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{state.error}</p>}
      {state.ok && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">{state.ok}</p>}
      {state.link && <CopyBox value={state.link} note={state.linkNote} />}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}

export function CopyBox({ value, note }: { value: string; note?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
      {note && <p className="mb-2 text-amber-900">{note}</p>}
      <div className="flex gap-2">
        <input readOnly value={value} className="min-w-0 flex-1 rounded border border-amber-300 bg-white px-2 py-1 font-mono text-xs" onFocus={(e) => e.target.select()} />
        <button
          type="button"
          className="shrink-0 rounded border border-amber-300 bg-white px-2 py-1 text-xs hover:bg-amber-100"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          className="shrink-0 rounded border border-amber-300 bg-white px-2 py-1 text-xs hover:bg-amber-100"
          href={`https://wa.me/?text=${encodeURIComponent(value)}`}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-50 print:hidden"
    >
      {copied ? "✓" : label}
    </button>
  );
}

export function SubmitButton({ children, className, pendingLabel = "…" }: { children: React.ReactNode; className?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 print:hidden">
      Print / save as PDF
    </button>
  );
}
