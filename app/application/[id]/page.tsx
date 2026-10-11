import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { Messages } from "@/components/Messages";
import { UploadRow } from "@/components/UploadRow";
import { ActionForm } from "@/components/forms";
import { DocBadge, StageBadge, card, fmtDate, inputCls, labelCls } from "@/components/ui";
import { fullPath } from "@/lib/blobdb";
import { buildChecklist, groupItems } from "@/lib/checklist";
import { FORMS } from "@/lib/citizenship";
import { questionnaireProgress } from "@/lib/questionnaire";
import { getViewer } from "@/lib/session";
import { CLIENT_EDITABLE } from "@/lib/status";
import { getApplication, listUploads, updateApplication, uploadPrefix } from "@/lib/store";
import { claimApplication } from "../../_actions/auth";
import { submitForReview } from "./actions";

export const metadata: Metadata = { title: "Your citizenship application — JT Immigration", robots: { index: false, follow: false } };

export default async function ApplicationPage({ params, searchParams }: PageProps<"/application/[id]">) {
  const { id } = await params;
  const { welcome } = await searchParams;
  const [viewer, app] = await Promise.all([getViewer(), getApplication(id)]);
  if (!app) notFound();

  if (viewer?.role === "staff") redirect(`/admin/cases/${id}`);
  if (!app.ownerId) return <ClaimApplication appId={id} signedIn={!!viewer} />;
  if (!viewer) redirect("/");
  if (app.ownerId !== viewer.id) notFound();

  const uploads = await listUploads(id);
  const checklist = buildChecklist(app, uploads);
  if (!checklist) notFound();
  const q = questionnaireProgress(app.basis, app.answers);
  const editable = CLIENT_EDITABLE.includes(app.status);
  const canSubmit = ["collecting", "changes_requested", "further_info"].includes(app.status);
  const unread = app.messages.filter((m) => m.from === "staff" && (!app.clientSeenAt || m.at > app.clientSeenAt)).length;
  const uploadBase = fullPath(uploadPrefix(id));

  if (unread) after(() => updateApplication(id, (a) => ({ ...a, clientSeenAt: new Date().toISOString() })).catch(() => {}));

  const todo: React.ReactNode[] = [];
  for (const i of checklist.issues) todo.push(<li key={`i-${i.doc.key}`}><a href={`#doc-${i.doc.key}`} className="underline">{i.title}</a>: {i.review?.reason ?? i.review?.note ?? "needs attention"}</li>);
  if (unread) todo.push(<li key="msg"><a href="#messages" className="underline">You have {unread} new message{unread > 1 ? "s" : ""}</a></li>);
  for (const s of q.sections.filter((s) => s.missing.length)) todo.push(<li key={`q-${s.section.id}`}><Link href={`/application/${id}/details?s=${s.section.id}`} className="underline">Answer questions: {s.section.title}</Link> ({s.missing.length} left)</li>);
  if (checklist.missing.length) todo.push(<li key="missing"><a href="#documents" className="underline">Upload {checklist.missing.length} required document{checklist.missing.length > 1 ? "s" : ""}</a></li>);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{app.clientName ?? "Your application"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Irish citizenship · {checklist.basis.short} · Ref {app.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <StageBadge stage={app.status} audience="client" />
      </div>

      {welcome && (
        <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
          <p className="font-medium">Your account is ready.</p>
          <p className="mt-1">Work through the questions and upload your documents in any order — everything saves as you go.</p>
        </div>
      )}

      <StatusPanel status={app.status} caseInfo={app.caseInfo} />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Questions" value={`${q.complete}/${q.total} sections`} href={`/application/${id}/details`} />
        <Stat label="Required documents" value={`${checklist.uploaded}/${checklist.required.length} uploaded`} href="#documents" />
        <Stat label="Approved by JT" value={`${checklist.approved}/${checklist.required.length}`} href="#documents" />
      </div>

      {todo.length > 0 && editable && (
        <div className="mt-6 rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200">
          <h2 className="font-semibold text-amber-900">To do</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">{todo}</ul>
        </div>
      )}

      {canSubmit && (
        <div className={`mt-6 p-4 ${card}`}>
          <h2 className="font-semibold text-navy">{app.status === "collecting" ? "Ready for JT Immigration to review?" : "Fixed everything?"}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {app.status === "collecting"
              ? "You don't need everything before sending — we'll review what you have and tell you exactly what's missing or needs changing."
              : "Send your application back to JT Immigration once you've dealt with the items above."}
          </p>
          <div className="mt-3">
            <ActionForm action={submitForReview.bind(null, id)} submitLabel={app.status === "collecting" ? "Send to JT Immigration for review" : "Send back for review"} pendingLabel="Sending…">
              <label className="flex gap-3 text-sm text-slate-700">
                <input name="declaration" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700" />
                <span>The information and documents I&apos;ve provided are true, genuine and belong to me, to the best of my knowledge.</span>
              </label>
            </ActionForm>
          </div>
        </div>
      )}

      <section id="details" className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy">Your answers</h2>
          <Link href={`/application/${id}/details`} className="text-sm font-medium text-emerald-700 hover:underline">
            {editable ? "Open questions →" : "View answers →"}
          </Link>
        </div>
        <ul className={`mt-3 divide-y divide-slate-200 ${card}`}>
          {q.sections.map(({ section, missing }) => (
            <li key={section.id}>
              <Link href={`/application/${id}/details?s=${section.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                <span className="text-navy">{section.title}</span>
                {missing.length === 0 ? <span className="text-xs font-medium text-emerald-700">✓ Complete</span> : <span className="text-xs text-amber-700">{missing.length} to answer</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="documents" className="mt-10 scroll-mt-16">
        <h2 className="text-lg font-semibold text-navy">Documents</h2>
        {editable && (
          <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <summary className="cursor-pointer font-medium text-navy">How to prepare your documents (read first)</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
              <li>
                Items marked <strong>certified</strong> must be a full-colour copy signed and dated by a solicitor, Commissioner for Oaths, Peace Commissioner or Notary Public who saw the original <strong>in person</strong>. Gardaí, employers and friends can&apos;t certify.
              </li>
              <li>Bring the originals, colour copies and the ISD certification forms (linked below) to one appointment, and upload both the certified copy and the completed form.</li>
              <li>One document per file. Multi-page documents (e.g. a bank statement) should be one PDF. Phone photos are fine — we convert them automatically.</li>
              <li>Documents not in English or Irish need a professional translation as well as the original.</li>
            </ul>
            <a href={FORMS.certifyingGuide.href} target="_blank" rel="noreferrer" className="mt-3 inline-block text-emerald-700 hover:underline">
              {FORMS.certifyingGuide.label} ↗
            </a>
          </details>
        )}
        {groupItems(checklist.items, checklist.basis).map((section) => (
          <div key={section.key} className="mt-6">
            <h3 className="font-semibold text-navy">{section.title}</h3>
            {section.intro && <p className="mt-1 max-w-3xl text-sm text-slate-600">{section.intro}</p>}
            {section.groups.map((group) => (
              <div key={group.name ?? "default"} className="mt-3">
                {group.name && <h4 className="mb-1.5 text-sm font-medium text-slate-700">{group.name}</h4>}
                <ul className={`divide-y divide-slate-200 ${card}`}>
                  {group.items.map((item) => (
                      <UploadRow
                        key={item.doc.key}
                        anchorId={`doc-${item.doc.key}`}
                        applicationId={id}
                        uploadBase={uploadBase}
                        docKey={item.doc.key}
                        title={item.doc.label}
                        hint={item.doc.hint}
                        optional={item.doc.optional}
                        link={item.doc.link}
                        files={item.files.map(({ path, filename, size, uploadedAt }) => ({ path, filename, size, uploadedAt }))}
                        badge={<DocBadge state={item.state} />}
                        issueNote={item.state === "issue" || item.state === "reuploaded" ? [item.review?.reason, item.review?.note].filter(Boolean).join(" — ") || undefined : undefined}
                        canEdit={editable}
                      />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section id="messages" className="mt-10 scroll-mt-16">
        <h2 className="text-lg font-semibold text-navy">Messages with JT Immigration</h2>
        <div className={`mt-3 p-4 ${card}`}>
          <Messages appId={id} messages={app.messages} viewerRole="client" placeholder="Ask a question or tell us about anything unusual…" />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className={`block p-4 hover:bg-slate-50 ${card}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-navy">{value}</p>
    </Link>
  );
}

function StatusPanel({ status, caseInfo }: { status: string; caseInfo: { isdNumber?: string; lodgedOn?: string; furtherInfoDueOn?: string; ceremonyOn?: string } }) {
  const text: Record<string, string> = {
    submitted: "JT Immigration is reviewing your documents and answers. We'll message you if anything needs changing. You can still add documents.",
    changes_requested: "We've reviewed your application and need a few things from you — see the list below. When you've dealt with them, send it back for review.",
    ready_to_lodge: "Everything is in order. JT Immigration will arrange a time with you to lodge your application on the Immigration Service portal (you'll need your card for the €175 fee).",
    lodged: `Your application was lodged${caseInfo.lodgedOn ? ` on ${fmtDate(caseInfo.lodgedOn)}` : ""}${caseInfo.isdNumber ? ` (ISD reference ${caseInfo.isdNumber})` : ""}. Processing usually takes around 12 months. Watch your email for the Garda vetting form — it must be completed within 30 days. Keep your IRP card in date and tell us if you move house.`,
    further_info: `The Immigration Service has asked for more information${caseInfo.furtherInfoDueOn ? ` — due by ${fmtDate(caseInfo.furtherInfoDueOn)}` : ""}. Please check your messages and upload what's needed as soon as possible.`,
    approved: `Your application has been approved. ${caseInfo.ceremonyOn ? `Your ceremony is on ${fmtDate(caseInfo.ceremonyOn)}. ` : ""}Make sure your IRP card is in date for the ceremony.`,
    completed: "Congratulations — you're an Irish citizen.",
  };
  if (!text[status]) return null;
  return <p className="mt-6 rounded-lg bg-navy p-4 text-sm text-white">{text[status]}</p>;
}

function ClaimApplication({ appId, signedIn }: { appId: string; signedIn: boolean }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold text-navy">Create your account to continue</h1>
      <p className="mt-2 text-sm text-slate-600">
        This application was started before accounts were introduced. {signedIn ? "Attach it to your account to continue." : "Create an account so you can keep working on it securely from any device."}
      </p>
      <div className="mt-6">
        <ActionForm action={claimApplication.bind(null, appId)} submitLabel={signedIn ? "Attach to my account" : "Create account"}>
          {!signedIn && (
            <>
              <label className={labelCls}>
                Full name
                <input name="name" required autoComplete="name" className={inputCls} />
              </label>
              <label className={labelCls}>
                Email
                <input name="email" type="email" required autoComplete="email" className={inputCls} />
              </label>
              <label className={labelCls}>
                Choose a password <span className="font-normal text-slate-400">(at least 8 characters)</span>
                <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
              </label>
            </>
          )}
        </ActionForm>
      </div>
      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(`/application/${appId}`)}`} className="text-emerald-700 underline">
          Sign in first
        </Link>
      </p>
    </div>
  );
}
