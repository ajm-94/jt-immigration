import "server-only";
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Password hashing (scrypt) and HMAC-signed stateless tokens for sessions and client links.

const SCRYPT = { N: 1 << 15, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number; maxmem: number }) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const { N, r, p, keylen, maxmem } = SCRYPT;
  const key = await scryptAsync(password, salt, keylen, { N, r, p, maxmem });
  return ["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  const [alg, n, r, p, saltB64, hashB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** AUTH_SECRET if set; otherwise derived from the Blob token, which is already a server-only secret. */
function secret(): Buffer {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return Buffer.from(s);
  const blob = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blob) throw new Error("Set AUTH_SECRET (or BLOB_READ_WRITE_TOKEN) to sign sessions");
  return createHash("sha256").update(`jt-immigration-auth:${blob}`).digest();
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest();

export type TokenPurpose = "session" | "invite";
export type TokenPayload = { sub: string; purpose: TokenPurpose; exp: number; ver: string };

export function createToken(payload: Omit<TokenPayload, "exp">, ttlSeconds: number): string {
  const body: TokenPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const part = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${part}.${sign(part).toString("base64url")}`;
}

export function verifyToken(token: string | undefined | null, purpose: TokenPurpose): TokenPayload | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot !== token.lastIndexOf(".")) return null;
  const part = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = sign(part);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as TokenPayload;
    if (payload.purpose !== purpose || typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Permanent client sign-in link token. Bumping the user's linkVersion invalidates every earlier link. */
export function accessToken(userId: string, version: number): string {
  const part = `${userId}.${version}`;
  return `${part}.${createHmac("sha256", secret()).update(`access:${part}`).digest("base64url")}`;
}

export function verifyAccessToken(token: string): { sub: string; ver: number } | null {
  const [sub, ver, sig] = token.split(".");
  if (!sub || !ver || !sig || !/^\d+$/.test(ver)) return null;
  const expected = Buffer.from(accessToken(sub, Number(ver)).split(".")[2], "base64url");
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { sub, ver: Number(ver) };
}

export const emailKey = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
