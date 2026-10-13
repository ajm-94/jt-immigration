"use client";

import { useState } from "react";
import { extractStatementRows, monthlyPosCounts, type StatementRow } from "@/lib/bank-statement";

type StatementFile = { path: string; filename: string; size: number };

export function BankStatementChecker({ files }: { files: StatementFile[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [start, setStart] = useState("");
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [identity, setIdentity] = useState(false);
  const [bank, setBank] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const counts = monthlyPosCounts(rows, start);
  const passes = counts.length === 3 && counts.every((month) => month.count >= 3);
  const pdfs = files.filter((file) => /\.pdf$/i.test(file.filename));

  function resetReview(next: StatementRow[]) {
    setRows(next);
    setIdentity(false);
    setBank(false);
  }

  async function readPdfs() {
    setBusy(true);
    setMessage("");
    resetReview([]);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const extracted: StatementRow[] = [];
      const unreadable: string[] = [];
      for (const path of selected) {
        const file = pdfs.find((item) => item.path === path)!;
        if (file.size > 20 * 1024 * 1024) throw new Error("Please use PDFs smaller than 20 MB.");
        const response = await fetch(`/api/file?p=${encodeURIComponent(path)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Could not open a statement. Please sign in again and retry.");
        const task = pdfjs.getDocument({ data: new Uint8Array(await response.arrayBuffer()) });
        try {
          const pdf = await task.promise;
          if (pdf.numPages > 100) throw new Error("Please split statements longer than 100 pages.");
          let found = 0;
          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            setMessage(`Reading ${file.filename}, page ${pageNumber} of ${pdf.numPages}…`);
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            const lines: string[] = [];
            let line = "";
            let previousY: number | undefined;
            for (const item of content.items) {
              if (!("str" in item)) continue;
              const y = item.transform[5];
              if (previousY !== undefined && Math.abs(y - previousY) > 3 && line) { lines.push(line); line = ""; }
              line += `${item.str} `;
              previousY = y;
              if (item.hasEOL) { lines.push(line); line = ""; previousY = undefined; }
            }
            if (line) lines.push(line);
            const next = extractStatementRows(lines.join("\n"), `${file.filename}, page ${pageNumber}`, year);
            found += next.length;
            extracted.push(...next);
            page.cleanup();
          }
          if (!found) unreadable.push(file.filename);
        } finally { await task.destroy(); }
      }
      resetReview(extracted);
      setMessage(`${extracted.length} dated rows found. Check dates and remove duplicates before counting.${unreadable.length ? ` No dated rows could be read from: ${unreadable.join(", ")}. Use the manual entry below for scans or unsupported layouts.` : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read this PDF. Try a searchable PDF or manual entry.");
    } finally { setBusy(false); }
  }

  return (
    <details className="rounded-lg border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer font-semibold text-navy">Bank statement — point-of-sale check</summary>
      <div className="mt-3 space-y-4 text-sm">
        <p>Check at least 3 point-of-sale transactions on the island of Ireland in each of 3 consecutive months. Results are for staff review; they do not approve the document automatically.</p>
        <p className="text-xs text-slate-500">Statement text is read in your browser. This review is not saved and resets when you leave this page. Scans and some bank layouts require manual entry.</p>
        <div className="flex flex-wrap gap-3">
          <label>Year for rows with no year <input type="number" min="1900" max="2100" value={year} onChange={(event) => setYear(Number(event.target.value))} className="ml-2 w-24 rounded border p-1" /></label>
          <label>First of 3 months <input type="month" value={start} onChange={(event) => setStart(event.target.value)} className="ml-2 rounded border p-1" /></label>
        </div>
        <fieldset disabled={busy} className="space-y-1">
          <legend className="font-medium">Choose the uploaded statement PDFs</legend>
          {pdfs.length ? pdfs.map((file) => <label key={file.path} className="block"><input type="checkbox" checked={selected.includes(file.path)} onChange={(event) => setSelected(event.target.checked ? [...selected, file.path] : selected.filter((path) => path !== file.path))} className="mr-2" />{file.filename}</label>) : <p>No PDFs uploaded to this case yet.</p>}
          <button type="button" onClick={readPdfs} disabled={busy || !selected.length || year < 1900 || year > 2100 || !Number.isInteger(year)} className="mt-2 rounded bg-emerald-700 px-3 py-2 text-white disabled:opacity-40">{busy ? "Reading…" : "Read selected statements"}</button>
        </fieldset>
        <p role="status" className="text-slate-600">{message}</p>
        <details>
          <summary className="cursor-pointer">Paste statement text or add a transaction manually</summary>
          <textarea aria-label="Statement text" value={text} onChange={(event) => setText(event.target.value)} rows={4} placeholder="One dated transaction per line, e.g. 12/03/2026 POS Merchant Dublin 24.50" className="mt-2 w-full rounded border p-2" />
          <button type="button" disabled={busy || !text.trim() || !Number.isInteger(year) || year < 1900 || year > 2100} onClick={() => { resetReview(extractStatementRows(text, "Pasted text", year)); setMessage("Check all extracted dates and descriptions against the original statement."); }} className="rounded border px-3 py-1">Read pasted text (replaces current rows)</button>
          <div className="mt-3 flex flex-wrap gap-2">
            <input aria-label="Transaction date" type="date" value={manualDate} onChange={(event) => setManualDate(event.target.value)} className="rounded border p-1" />
            <input aria-label="Transaction description" placeholder="Merchant / transaction description" value={manualDescription} onChange={(event) => setManualDescription(event.target.value)} className="min-w-48 flex-1 rounded border p-1" />
            <button type="button" disabled={busy || !manualDate || !manualDescription.trim()} onClick={() => { setRows([...rows, { date: manualDate, description: manualDescription.trim(), source: "Manual entry", candidate: false, confirmed: false }]); setManualDescription(""); }} className="rounded border px-3 py-1">Add row</button>
          </div>
        </details>
        {rows.length > 0 && <>
          <p>Tick only transactions you have confirmed are point-of-sale purchases in Ireland, with merchant location evidence. Online purchases, transfers, ATM withdrawals, refunds and duplicate rows should not be counted. A suggested POS label alone does not confirm this.</p>
          <div className="max-h-96 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Confirmed Irish POS</th><th className="p-2">Date</th><th className="p-2">Transaction / source</th><th className="p-2">Remove</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t"><td className="p-2"><input aria-label={`Confirm Irish POS: ${row.date} ${row.description}`} type="checkbox" checked={row.confirmed} onChange={(event) => setRows(rows.map((item, i) => i === index ? { ...item, confirmed: event.target.checked } : item))} /></td><td className="p-2"><input aria-label={`Date for transaction ${index + 1}`} type="date" value={row.date} onChange={(event) => setRows(rows.map((item, i) => i === index ? { ...item, date: event.target.value, confirmed: false } : item))} /></td><td className="p-2">{row.description}{row.candidate && <span className="ml-2 text-emerald-700">Possible POS</span>}<div className="text-slate-500">{row.source}</div></td><td className="p-2"><button type="button" onClick={() => setRows(rows.filter((_, i) => i !== index))} className="text-red-700">Remove</button></td></tr>)}</tbody></table></div>
        </>}
        <label className="block"><input type="checkbox" checked={identity} onChange={(event) => setIdentity(event.target.checked)} className="mr-2" />I checked the account holder’s name, Irish address and statement dates against the case.</label>
        <label className="block"><input type="checkbox" checked={bank} onChange={(event) => setBank(event.target.checked)} className="mr-2" />I checked that the bank or credit union is regulated by the CBI or ECB.</label>
        {counts.length > 0 ? <div className="rounded bg-slate-50 p-3" aria-live="polite">
          {counts.map((month) => <p key={month.month}>{month.month}: {month.count} confirmed POS transactions — {month.count >= 3 ? "meets count" : `needs ${3 - month.count} more`}</p>)}
          <p className="mt-2 font-medium">{passes ? identity && bank ? "The selected period meets the reviewed checks." : "The transaction counts meet the threshold. Complete the identity and bank checks." : "The selected period does not yet have 3 confirmed POS transactions in every month."}</p>
          <p className="mt-1 text-xs">Use the document’s existing Approve or Flag issue controls after completing your review.</p>
        </div> : <p>Choose the first month to see the three monthly counts.</p>}
      </div>
    </details>
  );
}
