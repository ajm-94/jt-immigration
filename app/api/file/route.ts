import { openFile } from "@/lib/blobdb";
import { canAccess, getViewer } from "@/lib/session";
import { getApplication, uploadPrefix } from "@/lib/store";

const INLINE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

// Streams a private uploaded document to its owner or to staff.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("p") ?? "";
  const viewer = await getViewer();
  if (!viewer) return new Response("Please sign in", { status: 401 });
  const id = path.split("/")[1] ?? "";
  if (!path.startsWith(uploadPrefix(id)) || path.includes("..")) return new Response("Not found", { status: 404 });
  const app = await getApplication(id);
  if (!app || !canAccess(viewer, app)) return new Response("Not found", { status: 404 });

  const res = await openFile(path);
  if (!res || res.statusCode !== 200) return new Response("Not found", { status: 404 });

  const filename = (path.split("/").pop() ?? "document").replace(/["\\\r\n]/g, "");
  const type = res.blob.contentType;
  const disposition = INLINE_TYPES.has(type) && !url.searchParams.has("download") ? "inline" : "attachment";
  return new Response(res.stream, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
