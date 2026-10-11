import { openFile } from "@/lib/blobdb";
import { buildChecklist } from "@/lib/checklist";
import { packEntries } from "@/lib/pack";
import { getViewer } from "@/lib/session";
import { getApplication, listUploads } from "@/lib/store";
import { zipStream, type ZipEntry } from "@/lib/zip";

export const maxDuration = 300;

// Streams every document in the case as one ZIP, named and foldered for lodging.
export async function GET(_req: Request, ctx: RouteContext<"/admin/cases/[id]/download">) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "staff") return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  const app = await getApplication(id);
  if (!app) return new Response("Not found", { status: 404 });
  const cl = buildChecklist(app, await listUploads(id));
  if (!cl) return new Response("Unknown basis", { status: 400 });
  const entries = packEntries(cl, app.clientName ?? "");
  if (entries.length === 0) return new Response("No documents uploaded yet.", { status: 404, headers: { "Content-Type": "text/plain" } });

  async function* files(): AsyncGenerator<ZipEntry> {
    for (const e of entries) {
      yield {
        name: e.name,
        lastModified: new Date(e.uploadedAt),
        open: async () => {
          const r = await openFile(e.path);
          if (!r || r.statusCode !== 200) throw new Error(`Missing file ${e.path}`);
          return r.stream;
        },
      };
    }
  }

  const zipName = `${(app.clientName ?? id.slice(0, 8)).replace(/[^\w.-]+/g, "_")}_citizenship_documents.zip`;
  return new Response(zipStream(files()), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
