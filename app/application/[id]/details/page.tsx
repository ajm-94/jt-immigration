import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionnaireForm } from "@/components/QuestionnaireForm";
import { questionnaireProgress } from "@/lib/questionnaire";
import { requireApplication } from "@/lib/session";
import { CLIENT_EDITABLE } from "@/lib/status";

export const metadata: Metadata = { title: "Your answers — JT Immigration", robots: { index: false, follow: false } };

export default async function DetailsPage({ params, searchParams }: PageProps<"/application/[id]/details">) {
  const { id } = await params;
  const { s } = await searchParams;
  const { viewer, app } = await requireApplication(id);
  const progress = questionnaireProgress(app.basis, app.answers);
  const sections = progress.sections;
  const index = Math.max(0, sections.findIndex((x) => x.section.id === s));
  const current = sections[index];
  if (!current) notFound();
  const next = sections[index + 1];
  const isStaff = viewer.role === "staff";
  const readOnly = !isStaff && !CLIENT_EDITABLE.includes(app.status);
  const back = isStaff ? `/admin/cases/${id}` : `/application/${id}`;

  // Pre-fill contact details the client already gave us.
  const d = app.details;
  const [first, ...rest] = (app.clientName ?? "").split(" ");
  const prefill: Record<string, string | undefined> = {
    email: app.clientEmail,
    firstNames: first || undefined,
    lastName: rest.join(" ") || undefined,
    phone: d?.phone,
    dateOfBirth: d?.dateOfBirth,
    nationality: d?.nationality,
    address: d?.address,
  };
  const initial = { ...app.answers };
  for (const [k, v] of Object.entries(prefill)) if (v && !initial[k]) initial[k] = v;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href={back} className="text-sm text-emerald-700 hover:underline">
        ← {isStaff ? "Back to case" : "Back to your application"}
      </Link>
      <div className="mt-4 grid gap-8 md:grid-cols-[220px_1fr]">
        <nav className="md:sticky md:top-16 md:self-start">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Questions · {progress.complete}/{progress.total} complete
          </p>
          <ol className="space-y-0.5 text-sm">
            {sections.map(({ section, missing }, i) => (
              <li key={section.id}>
                <Link
                  href={`/application/${id}/details?s=${section.id}`}
                  className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${i === index ? "bg-navy text-white" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  <span>{section.title}</span>
                  <span className={`text-xs ${i === index ? "text-slate-300" : missing.length ? "text-amber-600" : "text-emerald-600"}`}>{missing.length ? missing.length : "✓"}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-navy">{current.section.title}</h1>
          {current.section.intro && <p className="mt-1 text-sm text-slate-600">{current.section.intro}</p>}
          {readOnly && (
            <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm text-slate-700">Your application has been lodged, so answers are locked. Message JT Immigration if anything has changed.</p>
          )}
          <div className="mt-6">
            <QuestionnaireForm
              key={current.section.id}
              appId={id}
              section={current.section}
              initial={initial}
              nextHref={next ? `/application/${id}/details?s=${next.section.id}` : back}
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
