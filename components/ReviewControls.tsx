"use client";

import { useActionState, useState } from "react";
import { reviewDocument } from "@/app/admin/actions";
import { ISSUE_REASONS } from "@/lib/citizenship";

type Review = { status: "approved" | "issue"; reason?: string; note?: string; by: string; at: string };

export function ReviewControls({ appId, docKey, review, hasFiles }: { appId: string; docKey: string; review?: Review; hasFiles: boolean }) {
  const [state, action, pending] = useActionState(reviewDocument.bind(null, appId, docKey), {});
  const [flagging, setFlagging] = useState(false);

  return (
    <div className="mt-3 rounded-md bg-slate-50 p-2.5 text-sm">
      {review && (
        <p className="mb-2 text-xs text-slate-500">
          {review.status === "approved" ? "✓ Approved" : "⚑ Flagged"} by {review.by} on{" "}
          {new Date(review.at).toLocaleString("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          {review.status === "issue" && (review.reason || review.note) ? ` — ${[review.reason, review.note].filter(Boolean).join(" — ")}` : ""}
        </p>
      )}
      {!flagging ? (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <button name="decision" value="approved" disabled={pending || !hasFiles} className="rounded-md bg-emerald-700 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-40">
            ✓ Approve
          </button>
          <button type="button" onClick={() => setFlagging(true)} disabled={pending} className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
            ⚑ Flag issue
          </button>
          {review && (
            <button name="decision" value="clear" disabled={pending} className="text-xs text-slate-500 hover:underline">
              Clear review
            </button>
          )}
          {pending && <span className="text-xs text-slate-500">Saving…</span>}
          {state.error && <span className="text-xs text-red-600">{state.error}</span>}
        </form>
      ) : (
        <form
          action={async (fd) => {
            await action(fd);
            setFlagging(false);
          }}
          className="space-y-2"
        >
          <input type="hidden" name="decision" value="issue" />
          <select name="reason" defaultValue="" className="block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs">
            <option value="">Reason (optional if you write a note)…</option>
            {ISSUE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <textarea name="note" rows={2} placeholder="Note for the client (they will see this)" className="block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs" />
          <div className="flex gap-2">
            <button disabled={pending} className="rounded-md bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-50">
              {pending ? "Saving…" : "Save flag"}
            </button>
            <button type="button" onClick={() => setFlagging(false)} className="text-xs text-slate-500 hover:underline">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
