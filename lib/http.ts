import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function fail(message: string, status = 400) {
  return json({ error: message }, status);
}

export function handle(error: unknown) {
  if (error instanceof HttpError) return fail(error.message, error.status);
  if (error instanceof ZodError) return fail(error.issues[0]?.message || "Check the form and try again.", 400);
  console.error(error);
  return fail("Something went wrong on the server.", 500);
}

function headerFirst(req: NextRequest, name: string) {
  return req.headers.get(name)?.split(",")[0]?.trim() || "";
}

/** Public scheme, honoring a TLS-terminating proxy or tunnel. */
export function forwardedProto(req: NextRequest): "https" | "http" {
  const forced = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (forced === "true" || forced === "1") return "https";
  if (forced === "false" || forced === "0") return "http";

  const forwardedProtoHeader = headerFirst(req, "x-forwarded-proto").toLowerCase();
  if (forwardedProtoHeader === "https" || forwardedProtoHeader === "http") return forwardedProtoHeader;

  const forwarded = req.headers.get("forwarded") || "";
  const proto = forwarded.match(/proto=(https|http)/i)?.[1]?.toLowerCase();
  if (proto === "https" || proto === "http") return proto;

  const visitor = req.headers.get("cf-visitor");
  if (visitor) {
    try {
      const parsed = JSON.parse(visitor) as { scheme?: string };
      if (parsed.scheme === "https" || parsed.scheme === "http") return parsed.scheme;
    } catch {
      /* ignore malformed cf-visitor */
    }
  }
  if (req.headers.get("x-forwarded-ssl")?.toLowerCase() === "on") return "https";
  return req.nextUrl.protocol === "https:" ? "https" : "http";
}

export function externalHost(req: NextRequest) {
  return headerFirst(req, "x-forwarded-host") || req.headers.get("host") || "";
}

function normalizeHost(value: string) {
  const trimmed = value.trim().toLowerCase().replace(/\/$/, "");
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`);
    if (!url.port || url.port === "80" || url.port === "443") return url.hostname;
    return `${url.hostname}:${url.port}`;
  } catch {
    return trimmed.replace(/:(80|443)$/, "");
  }
}

export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  let originHost = "";
  try {
    originHost = normalizeHost(new URL(origin).host);
  } catch {
    throw new HttpError(403, "Cross-origin request blocked.");
  }
  const expected = normalizeHost(externalHost(req));
  const allowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => normalizeHost(item))
    .filter(Boolean);
  if (originHost === expected || allowed.includes(originHost)) return;
  throw new HttpError(403, "Cross-origin request blocked.");
}

type Ctx = { params: Promise<Record<string, string>> };

export function api(handler: (req: NextRequest, ctx: Ctx) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (error) {
      return handle(error);
    }
  };
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Request body must be JSON.");
  }
}
