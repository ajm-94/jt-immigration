import { redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/crypto";
import { getViewer, startSession } from "@/lib/session";
import { updateApplication, withActivity } from "@/lib/store";
import { getUser, updateUser } from "@/lib/users";

// A client's personal link: opening it signs them straight into their application. No password.
export async function GET(_req: Request, ctx: RouteContext<"/c/[token]">) {
  const { token } = await ctx.params;
  const payload = verifyAccessToken(token);
  const user = payload ? await getUser(payload.sub) : null;
  if (!payload || !user || user.role !== "client" || user.disabled || (user.linkVersion ?? 1) !== payload.ver) redirect("/?link=expired");

  const appId = user.applicationIds[0];
  // Staff checking a client's link shouldn't be signed out of the admin.
  const viewer = await getViewer();
  if (viewer?.role === "staff") redirect(appId ? `/admin/cases/${appId}` : "/admin");

  const now = new Date().toISOString();
  const first = !user.activatedAt;
  const updated = await updateUser(user.id, (u) => ({ ...u, activatedAt: u.activatedAt ?? now, lastLoginAt: now }));
  if (first && appId) await updateApplication(appId, (a) => withActivity(a, user.name, "Client opened their link for the first time")).catch(() => {});
  if (viewer?.id !== user.id) await startSession(updated);
  redirect(appId ? `/application/${appId}` : "/portal");
}
