import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { stripPrefix, storePrefix } from "@/lib/blobdb";
import { documentsFor, getBasis } from "@/lib/citizenship";
import { canAccess, getViewer } from "@/lib/session";
import { CLIENT_EDITABLE } from "@/lib/status";
import { getApplication } from "@/lib/store";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif"];

// Issues short-lived tokens for direct browser → Blob uploads. Auth happens inside
// onBeforeGenerateToken (the browser's request carries the session cookie); the
// completion callback from Vercel has no cookie and needs no auth here.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (fullPathname) => {
        const viewer = await getViewer();
        if (!viewer) throw new Error("Your session has expired — please sign in again.");
        if (!fullPathname.startsWith(storePrefix())) throw new Error("Invalid upload path");
        // Expected: uploads/<applicationId>/<docKey>/<filename>
        const [root, id, docKey, ...rest] = stripPrefix(fullPathname).split("/");
        if (root !== "uploads" || !id || !docKey || rest.length !== 1 || fullPathname.includes("..")) throw new Error("Invalid upload path");
        const app = await getApplication(id);
        if (!app || !canAccess(viewer, app)) throw new Error("Application not found");
        if (viewer.role !== "staff" && !CLIENT_EDITABLE.includes(app.status)) throw new Error("This application is locked. Please message JT Immigration.");
        const basis = getBasis(app.basis);
        if (!basis || !documentsFor(basis).some((d) => d.key === docKey)) throw new Error("Unknown document type");
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: 20 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // Uploads are discovered by listing; the browser calls recordUpload() for the activity log.
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
