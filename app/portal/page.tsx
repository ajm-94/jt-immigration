import Link from "next/link";
import { redirect } from "next/navigation";
import { StageBadge } from "@/components/ui";
import { getBasis } from "@/lib/citizenship";
import { getViewer } from "@/lib/session";
import { getApplication, type Application } from "@/lib/store";

export default async function PortalPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  if (viewer.role === "staff") redirect("/admin");
  const apps = (await Promise.all(viewer.applicationIds.map(getApplication))).filter((a): a is Application => !!a && a.ownerId === viewer.id);
  if (apps.length === 1) redirect(`/application/${apps[0].id}`);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-navy">Your applications</h1>
      {apps.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">You don&apos;t have an application yet. Contact JT Immigration.</p>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200">
          {apps.map((a) => (
            <li key={a.id}>
              <Link href={`/application/${a.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                <span>
                  <span className="font-medium text-navy">Irish citizenship · {getBasis(a.basis)?.short ?? a.basis}</span>
                  <span className="block text-xs text-slate-500">Ref {a.id.slice(0, 8).toUpperCase()}</span>
                </span>
                <StageBadge stage={a.status} audience="client" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
