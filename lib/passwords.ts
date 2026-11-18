import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

export function generatePassword(length = 12) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function sessionSecret() {
  return process.env.SESSION_SECRET || "codebharat-2026-demo-session-secret-change-me";
}

export function signToken(token: string) {
  return crypto.createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

export function newSessionToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, cookie: `${token}.${signToken(token)}`, tokenHash: sha256(token) };
}

export function parseSessionCookie(raw: string | undefined) {
  if (!raw) return null;
  const [token, sig] = raw.split(".");
  if (!token || !sig || token.length < 32) return null;
  const expected = signToken(token);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return { token, tokenHash: sha256(token) };
}
