import { redirect } from "next/navigation";
import { accessToken, verifyToken } from "@/lib/crypto";
import { getUser } from "@/lib/users";

// Invite links sent before clients switched to personal links: send them on to their personal link.
export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const payload = verifyToken(token, "invite");
  const user = payload ? await getUser(payload.sub) : null;
  if (!user || user.role !== "client" || user.disabled) redirect("/?link=expired");
  redirect(`/c/${accessToken(user.id, user.linkVersion ?? 1)}`);
}
