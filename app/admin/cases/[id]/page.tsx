import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { Messages } from "@/components/Messages";
import { ClientNameEditor } from "@/components/ClientNameEditor";
import { BankStatementChecker } from "@/components/BankStatementChecker";
import { ReviewControls } from "@/components/ReviewControls";
import { UploadRow } from "@/components/UploadRow";
import { ActionForm, CopyBox } from "@/components/forms";
import { DocBadge, StageBadge, btnDanger, btnSecondary, card, fmtDate, fmtDateTime, fmtSize, inputCls, labelCls, now } from "@/components/ui";
import { fullPath } from "@/lib/blobdb";
import { buildChecklist, groupItems } from "@/lib/checklist";
import { BASES, COMING_SOON_BASES } from "@/lib/citizenship";
import { emailConfigured } from "@/lib/email";
import { accessLink } from "@/lib/notify";
import { absenceByYear, permissionGaps, questionnaireProgress } from "@/lib/questionnaire";
import { requireStaffApplication } from "@/lib/session";
import { STAGES } from "@/lib/status";
import { listUploads, updateApplication, uploadPrefix, type Application } from "@/lib/store";
import { getUser } from "@/lib/users";
import {
  changeBasis,
  clientAccessLink,
  deleteCase,
  newClientLink,
  saveStaffNotes,
  sendIssuesToClient,
  setStage,
  updateCaseInfo,
  updateClientContact,
} from "../../actions";

export const metadata: Metadata = { title: "Case — JT Immigration", robots: { index: false, follow: false } };

const box = `p-4 ${card}`;
const h2 = "font-semibold text-navy";

export default async function CasePage({ params }: PageProps<"/admin/cases/[id]">) {
  const { id } = await params;
  const { viewer, app } = await requireStaffApplication(id);
  const [uploads, owner] = await Promise.all([listUploads(id), app.ownerId ? getUser(app.ownerId) : null]);
  const cl = buildChecklist(app, uploads);
  const clientLink = owner ? await accessLink(owner) : null;
  const q = questionnaireProgress(app.basis, app.answers);
  const canEmail = emailConfigured();
  const uploadBase = fullPath(uploadPrefix(id));
  const newSinceSeen = app.staffSeenAt ? app.activity.filter((a) => a.at > app.staffSeenAt! && a.by !== viewer.name) : [];

  const unseen = !!app.clientActivityAt && (!app.staffSeenAt || app.clientActivityAt > app.staffSeenAt);
  if (unseen) after(() => updateApplication(id, (a) => ({ ...a, staffSeenAt: new Date().toISOString() })).catch(() => {}));

  if (!cl) return <p className="p-8">Unknown basis “{app.basis}”.</p>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link href="/admin" className="text-sm text-emerald-700 hover:underline">
        ← Cases
      </Link>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{app.clientName ?? `Draft ${id.slice(0, 8).toUpperCase()}`}</h1>
          <ClientNameEditor appId={id} name={app.clientName} />
          <p className="mt-0.5 text-sm text-slate-500">
            {app.clientEmail ?? "no email"}
            {typeof app.answers.phone === "string" && app.answers.phone ? ` · ${app.answers.phone}` : ""} · {cl.basis.short} · Ref {id.slice(0, 8).toUpperCase()} · created {fmtDate(app.createdAt)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Client: {!owner ? "no account (legacy link)" : owner.lastLoginAt ? `last opened ${fmtDateTime(owner.lastLoginAt)}` : "hasn't opened their link yet"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge stage={app.status} />
          <a href={`/admin/cases/${id}/download`} className={btnSecondary}>
            ⬇ Download all (ZIP)
          </a>
          <Link href={`/admin/cases/${id}/sheet`} className={btnSecondary}>
            Form 8 transcription sheet
          </Link>
          <Link href={`/application/${id}/details`} className={btnSecondary}>
            Edit answers
          </Link>
        </div>
      </div>

      {newSinceSeen.length > 0 && (
        <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-200">
          <p className="font-medium">New since you last looked:</p>
          <ul className="mt-1 list-disc pl-5">
            {newSinceSeen.slice(0, 8).map((a, i) => (
              <li key={i}>
                {fmtDateTime(a.at)} — {a.by}: {a.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ---------------- Main column: documents ---------------- */}
        <div className="min-w-0 space-y-6">
          <div className={box}>
            <div className="flex flex-wrap gap-2 text-sm">
              <Pill tone="slate">{cl.uploaded}/{cl.required.length} required uploaded</Pill>
              <Pill tone="emerald">{cl.approved} approved</Pill>
              <Pill tone="blue">{cl.awaitingReview.length} awaiting review</Pill>
              <Pill tone="red">{cl.issues.length} flagged</Pill>
              <Pill tone="slate">{cl.missing.length} missing</Pill>
              <Pill tone="slate">Questions {q.complete}/{q.total}</Pill>
            </div>
            <details className="mt-3" open={cl.issues.length > 0}>
              <summary className="cursor-pointer text-sm font-medium text-navy">Send issues to client{cl.issues.length ? ` (${cl.issues.length} flagged)` : ""}</summary>
              <div className="mt-3">
                <ActionForm action={sendIssuesToClient.bind(null, id)} submitLabel={canEmail ? "Send to client (email + message)" : "Add to client's messages"} pendingLabel="Sending…" className="space-y-3">
                  {cl.issues.length > 0 && (
                    <ul className="list-disc pl-5 text-sm text-slate-700">
                      {cl.issues.map((i) => (
                        <li key={i.doc.key}>
                          {i.title}: {[i.review?.reason, i.review?.note].filter(Boolean).join(" — ")}
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="includeMissing" defaultChecked={cl.missing.length > 0 && cl.missing.length <= 8} className="h-4 w-4 accent-emerald-700" />
                    Also list the {cl.missing.length} missing required document{cl.missing.length === 1 ? "" : "s"}
                  </label>
                  <label className={labelCls}>
                    Other items (one per line)
                    <textarea name="extra" rows={2} className={inputCls} placeholder={"e.g. Please answer the travel questions\nBook the spouse declaration for lodging day"} />
                  </label>
                  <label className={labelCls}>
                    Personal note
                    <textarea name="note" rows={2} className={inputCls} />
                  </label>
                  <p className="text-xs text-slate-500">Moves the case to “Waiting on client”.</p>
                </ActionForm>
              </div>
            </details>
          </div>

          <BankStatementChecker files={uploads.map(({ path, filename, size }) => ({ path, filename, size }))} />

          {groupItems(cl.items, cl.basis).map((section) => (
            <div key={section.key}>
              <h2 className={h2}>{section.title}</h2>
              {section.groups.map((group) => (
                <div key={group.name ?? "default"} className="mt-2">
                  {group.name && <h3 className="mb-1 text-sm font-medium text-slate-600">{group.name}</h3>}
                  <ul className={`divide-y divide-slate-200 ${card}`}>
                    {group.items.map((item) => (
                      <UploadRow
                        key={item.doc.key}
                        applicationId={id}
                        uploadBase={uploadBase}
                        docKey={item.doc.key}
                        title={item.doc.label}
                        optional={item.doc.optional}
                        files={item.files.map(({ path, filename, size, uploadedAt }) => ({ path, filename, size, uploadedAt }))}
                        badge={<DocBadge state={item.state} />}
                        canEdit
                      >
                        {(item.files.length > 0 || item.review) && <ReviewControls appId={id} docKey={item.doc.key} review={item.review} hasFiles={item.files.length > 0} />}
                      </UploadRow>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}

          {cl.orphans.length > 0 && (
            <div className={box}>
              <h2 className={h2}>Other files</h2>
              <p className="mt-1 text-xs text-slate-500">Uploaded under checklist items that no longer apply (e.g. after a basis change). They are included in the ZIP.</p>
              <ul className="mt-2 space-y-1 text-sm">
                {cl.orphans.map((f) => (
                  <li key={f.path}>
                    <a href={`/api/file?p=${encodeURIComponent(f.path)}`} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                      {f.docKey}/{f.filename}
                    </a>{" "}
                    <span className="text-xs text-slate-400">{fmtSize(f.size)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ---------------- Side column ---------------- */}
        <div className="space-y-4">
          <div className={box}>
            <h2 className={h2}>Stage</h2>
            <div className="mt-2">
              <ActionForm action={setStage.bind(null, id)} submitLabel="Update stage" className="space-y-2">
                <select name="stage" defaultValue={app.status} className={inputCls}>
                  {STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.staff}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="notify" disabled={!canEmail || !app.clientEmail} className="h-4 w-4 accent-emerald-700" />
                  Email the client about the change
                </label>
              </ActionForm>
            </div>
          </div>

          <div className={box}>
            <h2 className={h2}>Messages</h2>
            <div className="mt-3 max-h-[480px] overflow-y-auto">
              <Messages appId={id} messages={app.messages} viewerRole="staff" placeholder="Message the client (they get an email if email is set up)" />
            </div>
          </div>

          <Eligibility app={app} />

          <div className={box}>
            <h2 className={h2}>Case details</h2>
            <div className="mt-2">
              <ActionForm action={updateCaseInfo.bind(null, id)} submitLabel="Save case details" className="space-y-2">
                <CaseField name="isdNumber" label="ISD application number" value={app.caseInfo.isdNumber} />
                <CaseField name="lodgedOn" label="Lodged on" type="date" value={app.caseInfo.lodgedOn} />
                <CaseField name="acknowledgedOn" label="Acknowledged on" type="date" value={app.caseInfo.acknowledgedOn} />
                <CaseField name="vettingDueOn" label="Garda e-vetting due by" type="date" value={app.caseInfo.vettingDueOn} />
                <CaseField name="furtherInfoDueOn" label="ISD further info due by (28 days)" type="date" value={app.caseInfo.furtherInfoDueOn} />
                <CaseField name="decisionOn" label="Decision received on" type="date" value={app.caseInfo.decisionOn} />
                <CaseField name="certFeePaidOn" label="Certificate fee paid on" type="date" value={app.caseInfo.certFeePaidOn} />
                <CaseField name="ceremonyOn" label="Ceremony date" type="date" value={app.caseInfo.ceremonyOn} />
                <div className="grid grid-cols-2 gap-2">
                  <CaseField name="feeAgreed" label="JT fee agreed (€)" value={app.caseInfo.feeAgreed} />
                  <CaseField name="feePaid" label="JT fee paid (€)" value={app.caseInfo.feePaid} />
                </div>
                <CaseField name="nextAction" label="Next action" value={app.caseInfo.nextAction} />
                <CaseField name="nextActionDue" label="Next action due" type="date" value={app.caseInfo.nextActionDue} />
              </ActionForm>
            </div>
          </div>

          <div className={box}>
            <h2 className={h2}>Internal notes</h2>
            <p className="text-xs text-slate-500">Only staff can see these.</p>
            <div className="mt-2">
              <ActionForm action={saveStaffNotes.bind(null, id)} submitLabel="Save notes" className="space-y-2">
                <textarea name="notes" rows={5} defaultValue={app.staffNotes} className={inputCls} />
              </ActionForm>
            </div>
          </div>

          <div className={box}>
            <h2 className={h2}>Client link</h2>
            {clientLink ? (
              <div className="mt-2 space-y-2">
                <CopyBox value={clientLink} />
                <div className="flex flex-wrap gap-2">
                  {canEmail && app.clientEmail && (
                    <ActionForm action={clientAccessLink.bind(null, id)} submitLabel="Email it to them" pendingLabel="Sending…" className="space-y-2" buttonClass={btnSecondary}>
                      <input type="hidden" name="sendEmail" value="on" />
                    </ActionForm>
                  )}
                  <ActionForm
                    action={newClientLink.bind(null, id)}
                    submitLabel="New link"
                    pendingLabel="…"
                    className="space-y-2"
                    buttonClass={btnSecondary}
                    confirm="The current link will stop working and the client will be signed out. Continue?"
                  >
                    {null}
                  </ActionForm>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500">This case was started before accounts. Ask the client to open their original link.</p>
            )}
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-slate-600">Edit name / email / basis</summary>
              <div className="mt-2 space-y-4">
                <ActionForm action={updateClientContact.bind(null, id)} submitLabel="Save contact" className="space-y-2" buttonClass={btnSecondary}>
                  <input name="name" defaultValue={app.clientName} placeholder="Name" className={inputCls} />
                  <input name="email" type="email" defaultValue={app.clientEmail} placeholder="Email (optional)" className={inputCls} />
                </ActionForm>
                <ActionForm action={changeBasis.bind(null, id)} submitLabel="Change basis" className="space-y-2" buttonClass={btnSecondary}>
                  <select name="basis" defaultValue={app.basis} className={inputCls}>
                    {BASES.map((b) => (
                      <option key={b.slug} value={b.slug}>
                        {b.short}
                      </option>
                    ))}
                    {COMING_SOON_BASES.map((label) => (
                      <option key={label} disabled>
                        {label} (coming soon)
                      </option>
                    ))}
                  </select>
                </ActionForm>
              </div>
            </details>
          </div>

          <div className={box}>
            <h2 className={h2}>Activity</h2>
            <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto text-xs text-slate-600">
              {app.activity.map((a, i) => (
                <li key={i}>
                  <span className="text-slate-400">{fmtDateTime(a.at)}</span> · <span className="font-medium">{a.by}</span>: {a.text}
                </li>
              ))}
            </ul>
          </div>

          <details className={box}>
            <summary className="cursor-pointer text-sm font-medium text-red-700">Delete case (GDPR erasure)</summary>
            <p className="mt-2 text-xs text-slate-600">Permanently deletes every document, answer and message, and the client&apos;s login. This can&apos;t be undone — download the ZIP first if you need a copy.</p>
            <div className="mt-2">
              <ActionForm action={deleteCase.bind(null, id)} submitLabel="Delete permanently" pendingLabel="Deleting…" className="space-y-2" buttonClass={btnDanger} confirm="Delete this case and all its files permanently?">
                <input name="confirm" placeholder="Type DELETE" className={inputCls} />
              </ActionForm>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function Pill({ tone, children }: { tone: "slate" | "emerald" | "blue" | "red"; children: React.ReactNode }) {
  const cls = { slate: "bg-slate-100 text-slate-700", emerald: "bg-emerald-100 text-emerald-800", blue: "bg-blue-100 text-blue-800", red: "bg-red-100 text-red-800" }[tone];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

function CaseField({ name, label, value, type = "text" }: { name: string; label: string; value?: string; type?: string }) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <input name={name} type={type} defaultValue={value ?? ""} className="mt-0.5 block w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
    </label>
  );
}

function Eligibility({ app }: { app: Application }) {
  const trips = Array.isArray(app.answers.trips) ? app.answers.trips : [];
  const perms = Array.isArray(app.answers.permissions) ? app.answers.permissions : [];
  const years = absenceByYear(trips);
  const gaps = permissionGaps(perms);
  const irp = typeof app.answers.irpExpiry === "string" ? app.answers.irpExpiry : "";
  const passportExpiry = typeof app.answers.passportExpiry === "string" ? app.answers.passportExpiry : "";
  const student = perms.filter((p) => p.stamp === "Stamp 2" || p.stamp === "Stamp 2A");
  const flags: string[] = [];
  if (years[0].days > 100) flags.push(`${years[0].days} days abroad in the last 12 months — over 100, can't apply yet.`);
  else if (years[0].days > 70) flags.push(`${years[0].days} days abroad in the last 12 months — over 70, needs reasons (max 100).`);
  for (const g of gaps) flags.push(`Gap in permission: ${g.days} days between ${g.after} and ${g.before}.`);
  if (student.length) flags.push(`Student stamp time (${student.length} period${student.length > 1 ? "s" : ""}) doesn't count as reckonable residence.`);
  if (app.answers.protectionApplicant === "Yes") flags.push("Was an international protection applicant — that time doesn't count.");
  if (app.answers.q8_3 === "Yes" || app.answers.q8_1 === "Yes" || app.answers.q8_8 === "Yes") flags.push("Disclosed offences / convictions / investigations — check background section.");
  if (irp && Date.parse(irp) < now() + 120 * 86_400_000) flags.push(`IRP expires ${fmtDate(irp)} — must stay valid until the ceremony.`);
  if (passportExpiry && Date.parse(passportExpiry) < now() + 90 * 86_400_000) flags.push(`Passport expires ${fmtDate(passportExpiry)}.`);
  if (app.answers.calculatorDone === "No") flags.push("Client says the ISD residency calculator says they don't qualify.");
  if (app.details) flags.push("Legacy record: the client gave basic details before the questionnaire existed (shown below).");

  return (
    <div className={box}>
      <h2 className={h2}>Eligibility checks</h2>
      <p className="mt-1 text-xs text-slate-500">Days abroad (excl. travel days): {years.map((y) => `${y.year === 1 ? "last 12m" : `yr ${y.year}`} ${y.days}`).join(" · ")}</p>
      {flags.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
          {flags.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-emerald-700">No automatic red flags from the answers so far.</p>
      )}
      {app.details && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {Object.entries(app.details).map(([k, v]) => (
            <div key={k}>
              <dt className="text-slate-500">{k}</dt>
              <dd className="break-words text-slate-800">{v || "—"}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
