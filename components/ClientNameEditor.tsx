"use client";

import { useActionState, useState } from "react";
import { updateClientName } from "@/app/admin/actions";
import type { FormState } from "@/components/forms";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "@/components/ui";

export function ClientNameEditor({ appId, name }: { appId: string; name?: string }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="mt-2">
      {editing ? (
        <NameForm appId={appId} name={name} onCancel={() => setEditing(false)} onSaved={(text) => { setMessage(text); setEditing(false); }} />
      ) : (
        <button type="button" className={btnSecondary} onClick={() => { setMessage(""); setEditing(true); }}>Edit client name</button>
      )}
      {message && <p role="status" className="mt-2 text-sm text-emerald-700">{message}</p>}
    </div>
  );
}

function NameForm({ appId, name, onCancel, onSaved }: { appId: string; name?: string; onCancel: () => void; onSaved: (text: string) => void }) {
  const [state, action, pending] = useActionState(async (prev: FormState, form: FormData) => {
    const result = await updateClientName(appId, prev, form);
    if (result.ok) onSaved(result.ok);
    return result;
  }, {});
  return (
    <form action={action} className="max-w-md space-y-2">
      <label className={labelCls}>
        Client name
        <input autoFocus required maxLength={120} name="name" defaultValue={name ?? ""} className={inputCls} disabled={pending} />
      </label>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Saving…" : "Save name"}</button>
        <button type="button" disabled={pending} className={btnSecondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
