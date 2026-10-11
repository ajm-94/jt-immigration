import "server-only";
import { BlobPreconditionFailedError, del, get, list, put } from "@vercel/blob";

// A tiny JSON document store on top of private Vercel Blob.
// Every path is namespaced by STORE_PREFIX so local development (e.g. "dev/") never touches live data.
// Writes to existing documents use ETag optimistic concurrency (ifMatch) and retry on conflict.

const PREFIX = process.env.STORE_PREFIX ?? "";

export const fullPath = (path: string) => `${PREFIX}${path}`;
export const stripPrefix = (pathname: string) => (pathname.startsWith(PREFIX) ? pathname.slice(PREFIX.length) : pathname);
export const storePrefix = () => PREFIX;

const JSON_OPTS = { access: "private", contentType: "application/json", addRandomSuffix: false, cacheControlMaxAge: 60 } as const;

// Next.js memoizes identical GET fetches within a request; a fresh AbortSignal opts out,
// so every read (and every retry after a write conflict) sees the latest version.
const fresh = () => new AbortController().signal;

export async function readJson<T>(path: string): Promise<{ data: T; etag: string } | null> {
  const res = await get(fullPath(path), { access: "private", useCache: false, abortSignal: fresh() });
  if (!res || res.statusCode !== 200) return null;
  // Compressed CDN responses carry a weak ETag (W/"…"); conditional writes need the strong form.
  return { data: (await new Response(res.stream).json()) as T, etag: res.blob.etag.replace(/^W\//, "") };
}

export async function getJson<T>(path: string): Promise<T | null> {
  return (await readJson<T>(path))?.data ?? null;
}

/** Create a document; fails if it already exists. */
export async function createJson<T>(path: string, data: T) {
  await put(fullPath(path), JSON.stringify(data), { ...JSON_OPTS, allowOverwrite: false });
  return data;
}

/** Unconditional write (use only for documents with a single writer). */
export async function putJson<T>(path: string, data: T) {
  await put(fullPath(path), JSON.stringify(data), { ...JSON_OPTS, allowOverwrite: true });
  return data;
}

/** Read → mutate → conditional write, retrying if someone else wrote in between. */
export async function updateJson<T>(path: string, mutate: (current: T) => T, attempts = 8): Promise<T> {
  for (let i = 0; ; i++) {
    const current = await readJson<T>(path);
    if (!current) throw new Error(`Not found: ${path}`);
    const next = mutate(structuredClone(current.data));
    try {
      await put(fullPath(path), JSON.stringify(next), { ...JSON_OPTS, ifMatch: current.etag });
      return next;
    } catch (err) {
      if (err instanceof BlobPreconditionFailedError && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, Math.min(1500, 80 * 2 ** i) + Math.random() * 100));
        continue;
      }
      throw err;
    }
  }
}

export type ListedBlob = { path: string; size: number; uploadedAt: Date };

export async function listPaths(prefix: string): Promise<ListedBlob[]> {
  const out: ListedBlob[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: fullPath(prefix), cursor, limit: 1000 });
    for (const b of page.blobs) out.push({ path: stripPrefix(b.pathname), size: b.size, uploadedAt: new Date(b.uploadedAt) });
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

export async function deletePaths(paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) await del(paths.slice(i, i + 100).map(fullPath));
}

export async function openFile(path: string) {
  return get(fullPath(path), { access: "private", useCache: false, abortSignal: fresh() });
}
