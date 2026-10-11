"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { recordUpload, removeFile } from "@/app/application/[id]/actions";
import { shrinkPdf } from "@/lib/pdf-shrink";

// Safari converts HEIC photos to JPEG when JPEG is listed first; don't list .heic (WebKit bug).
const ACCEPT = "image/jpeg,image/png,application/pdf";
const MAX_BYTES = 20 * 1024 * 1024;
const ISD_MAX = 5 * 1024 * 1024;

export type RowFile = { path: string; filename: string; size: number; uploadedAt: string };

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** ISD accepts PDF/JPEG under 5MB: shrink large PDFs, and turn PNGs and large photos into a reasonably sized JPEG, in the browser. */
async function prepare(file: File, onProgress: (msg: string) => void): Promise<File> {
  if (file.type === "application/pdf") {
    if (file.size <= ISD_MAX) return file;
    // Can't shrink it (e.g. password-protected or very long) — upload the original; staff see the size warning.
    return (await shrinkPdf(file, ISD_MAX, onProgress).catch(() => null)) ?? file;
  }
  const isImage = file.type === "image/jpeg" || file.type === "image/png";
  if (!isImage || (file.type === "image/jpeg" && file.size <= ISD_MAX)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let scale = Math.min(1, 3000 / Math.max(bitmap.width, bitmap.height));
    for (let quality = 0.85; quality >= 0.5; quality -= 0.15) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (blob && blob.size <= ISD_MAX) return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
      scale *= 0.8;
    }
  } catch {
    // Browser can't decode it — upload the original and let staff deal with it.
  }
  return file;
}

export function UploadRow({
  applicationId,
  uploadBase,
  docKey,
  title,
  hint,
  optional,
  link,
  files,
  badge,
  issueNote,
  canEdit,
  children,
  anchorId,
}: {
  applicationId: string;
  /** Full blob path prefix for this application's uploads, e.g. "uploads/<id>/". */
  uploadBase: string;
  docKey: string;
  title: string;
  hint?: string;
  optional?: boolean;
  link?: { label: string; href: string };
  files: RowFile[];
  badge?: React.ReactNode;
  issueNote?: string;
  canEdit: boolean;
  /** Extra controls rendered under the files (e.g. staff review form). */
  children?: React.ReactNode;
  anchorId?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const busy = progress !== null || refreshing;

  async function onFiles(list: FileList | null) {
    if (!list?.length || busy || !canEdit) return;
    setError(null);
    const done: string[] = [];
    try {
      for (const original of Array.from(list)) {
        setProgress(`Preparing ${original.name}…`);
        const file = await prepare(original, setProgress);
        if (file.size > MAX_BYTES) throw new Error(`${original.name} is larger than 20 MB — please scan it at a lower resolution.`);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80) || "document";
        await upload(`${uploadBase}${docKey}/${safeName}`, file, {
          access: "private",
          handleUploadUrl: "/api/upload",
          multipart: file.size > 8 * 1024 * 1024,
          onUploadProgress: ({ percentage }) => setProgress(`Uploading ${Math.round(percentage)}%`),
        });
        done.push(safeName);
      }
    } catch (e) {
      const msg = (e as Error).message || "Upload failed.";
      setError(msg.replace(/^Vercel Blob: /, "") + " Please try again.");
    } finally {
      if (done.length) {
        await recordUpload(applicationId, docKey, done).catch(() => {});
        startTransition(() => router.refresh());
      }
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <li
      onDragOver={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(e.dataTransfer.files);
      }}
      id={anchorId}
      className={`scroll-mt-16 p-4 ${dragging ? "bg-emerald-50 ring-2 ring-inset ring-emerald-500" : ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-navy">{title}</p>
            {optional && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">If applicable</span>}
            {badge}
          </div>
          {hint && <p className="mt-1 max-w-2xl text-sm text-slate-600">{hint}</p>}
          {link && (
            <a href={link.href} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-emerald-700 hover:underline">
              Download: {link.label} ↗
            </a>
          )}
          {issueNote && (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
              <span className="font-medium">JT Immigration: </span>
              {issueNote}
            </p>
          )}
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f) => (
                <li key={f.path} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <a href={`/api/file?p=${encodeURIComponent(f.path)}`} target="_blank" rel="noreferrer" className="break-all font-medium text-emerald-700 hover:underline">
                    {f.filename}
                  </a>
                  <span className={`text-xs ${f.size > ISD_MAX ? "font-medium text-amber-700" : "text-slate-400"}`}>
                    {formatSize(f.size)}
                    {f.size > ISD_MAX ? " (over ISD's 5 MB limit)" : ""}
                  </span>
                  {canEdit && (
                    <form
                      action={removeFile.bind(null, applicationId, f.path)}
                      onSubmit={(e) => {
                        if (!window.confirm(`Remove ${f.filename}?`)) e.preventDefault();
                      }}
                    >
                      <button type="submit" className="text-xs text-slate-400 hover:text-red-600">
                        Remove
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        {canEdit && (
          <div className="shrink-0 sm:text-right">
            <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className={`w-full rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60 sm:w-auto ${
                files.length ? "border border-slate-300 text-slate-700 hover:bg-slate-50" : "bg-emerald-700 text-white hover:bg-emerald-800"
              }`}
            >
              {progress ?? (refreshing ? "Saving…" : files.length ? "Add / replace" : "Upload")}
            </button>
            <p className="mt-1 hidden text-xs text-slate-400 sm:block">or drag files here</p>
          </div>
        )}
      </div>
      {children}
    </li>
  );
}
