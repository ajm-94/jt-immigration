import { sendMessage } from "@/app/application/[id]/actions";
import { ActionForm } from "./forms";
import { fmtDateTime, inputCls } from "./ui";
import type { Message } from "@/lib/store";

export function Messages({ appId, messages, viewerRole, placeholder }: { appId: string; messages: Message[]; viewerRole: "client" | "staff"; placeholder?: string }) {
  return (
    <div>
      {messages.length === 0 ? (
        <p className="text-sm text-slate-500">No messages yet.</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => {
            const mine = m.from === viewerRole;
            return (
              <li key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${mine ? "ml-auto bg-emerald-50 ring-1 ring-emerald-200" : "bg-slate-50 ring-1 ring-slate-200"}`}>
                <p className="text-xs text-slate-500">
                  {m.from === "staff" ? `${m.authorName} (JT Immigration)` : m.authorName} · {fmtDateTime(m.at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800">{m.body}</p>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4">
        <ActionForm action={sendMessage.bind(null, appId)} submitLabel="Send message" pendingLabel="Sending…" className="space-y-2">
          <textarea name="body" rows={3} required placeholder={placeholder ?? "Write a message…"} className={inputCls} />
        </ActionForm>
      </div>
    </div>
  );
}
