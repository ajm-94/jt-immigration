// Browser-only: shrink a scanned PDF under a size limit by re-rendering each page as a JPEG.
// Text in the result is no longer selectable, which is fine for scans of certificates and statements.
// Both libraries are loaded on demand, only when a large PDF is actually uploaded.

const MAX_PAGES = 60;
/** Longest side of each rendered page in pixels, then the JPEG quality, from best to smallest. */
const ATTEMPTS = [
  { px: 2200, quality: 0.8 },
  { px: 1800, quality: 0.7 },
  { px: 1500, quality: 0.6 },
  { px: 1200, quality: 0.5 },
];

export async function shrinkPdf(file: File, maxBytes: number, onProgress?: (msg: string) => void): Promise<File | null> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const { PDFDocument } = await import("pdf-lib");

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const source = await task.promise;
    if (source.numPages > MAX_PAGES) return null;
    for (const { px, quality } of ATTEMPTS) {
      const out = await PDFDocument.create();
      for (let n = 1; n <= source.numPages; n++) {
        onProgress?.(`Making ${file.name} smaller… page ${n} of ${source.numPages}`);
        const page = await source.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: px / Math.max(base.width, base.height) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
        if (!blob) return null;
        const image = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
        // Keep the original page size in points so it prints the same.
        out.addPage([base.width, base.height]).drawImage(image, { x: 0, y: 0, width: base.width, height: base.height });
        page.cleanup();
      }
      const bytes = await out.save();
      if (bytes.length <= maxBytes) return new File([bytes as BlobPart], file.name, { type: "application/pdf" });
    }
    return null;
  } finally {
    await task.destroy();
  }
}
