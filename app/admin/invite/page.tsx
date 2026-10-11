import type { Metadata } from "next";
import { ActionForm } from "@/components/forms";
import { PageHeader, inputCls, labelCls } from "@/components/ui";
import { BASES, COMING_SOON_BASES } from "@/lib/citizenship";
import { emailConfigured } from "@/lib/email";
import { requireStaff } from "@/lib/session";
import { inviteClient } from "../actions";

export const metadata: Metadata = { title: "Add client — JT Immigration", robots: { index: false, follow: false } };

export default async function InvitePage() {
  await requireStaff();
  const canEmail = emailConfigured();
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <PageHeader title="Add a client" back={{ href: "/admin", label: "Cases" }} sub="You'll get a personal link to send them. Opening it takes them straight to their application — no password." />
      {!canEmail && (
        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Email sending isn&apos;t set up yet — copy the link and send it by WhatsApp or your own email.
        </p>
      )}
      <ActionForm action={inviteClient} submitLabel="Add client & get link" pendingLabel="Creating…">
        <label className={labelCls}>
          Client&apos;s full name
          <input name="name" required className={inputCls} />
        </label>
        <label className={labelCls}>
          Client&apos;s email <span className="font-normal text-slate-400">(optional)</span>
          <input name="email" type="email" className={inputCls} />
        </label>
        <label className={labelCls}>
          Basis of application
          <select name="basis" required defaultValue="standard" className={inputCls}>
            {BASES.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.short} — {b.years} years
              </option>
            ))}
            {COMING_SOON_BASES.map((label) => (
              <option key={label} disabled>
                {label} (coming soon)
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Personal note in the email <span className="font-normal text-slate-400">(optional)</span>
          <textarea name="note" rows={3} className={inputCls} placeholder="e.g. Lovely to speak to you today — start with the passport and birth certificate." />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="sendEmail" defaultChecked={canEmail} disabled={!canEmail} className="h-4 w-4 accent-emerald-700" />
          Email the link to the client
        </label>
      </ActionForm>
    </div>
  );
}
