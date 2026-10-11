import type { Metadata } from "next";
import { ActionForm } from "@/components/forms";
import { PageHeader, inputCls, labelCls } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { changePassword } from "../_actions/auth";

export const metadata: Metadata = { title: "Your account — JT Immigration", robots: { index: false } };

export default async function AccountPage() {
  const viewer = await requireUser("/account");
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageHeader title="Your account" sub={[viewer.name, viewer.email].filter(Boolean).join(" · ")} />
      <h2 className="font-medium text-navy">Change password</h2>
      <div className="mt-3">
        <ActionForm action={changePassword} submitLabel="Change password">
          <label className={labelCls}>
            Current password
            <input name="current" type="password" required autoComplete="current-password" className={inputCls} />
          </label>
          <label className={labelCls}>
            New password <span className="font-normal text-slate-400">(at least 8 characters)</span>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
          </label>
        </ActionForm>
      </div>
    </div>
  );
}
