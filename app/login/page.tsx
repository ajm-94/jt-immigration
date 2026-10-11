import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/forms";
import { inputCls } from "@/components/ui";
import { getViewer } from "@/lib/session";
import { login } from "../_actions/auth";

export const metadata: Metadata = { title: "Sign in — JT Immigration", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const viewer = await getViewer();
  if (viewer) redirect(viewer.role === "staff" ? "/admin" : "/portal");

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <ActionForm action={login} submitLabel="Sign in" pendingLabel="Signing in…" buttonClass="w-full rounded-md bg-emerald-700 px-4 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
        <input type="hidden" name="next" value={typeof next === "string" ? next : ""} />
        <input name="password" type="password" required autoComplete="current-password" autoFocus placeholder="Password" aria-label="Password" className={`${inputCls} py-3 text-base`} />
      </ActionForm>
    </div>
  );
}
