import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { forwardedProto, HttpError } from "@/lib/http";
import { newSessionToken, parseSessionCookie } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

export const COOKIE = "cb_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  username: string;
  role: "ADMIN" | "TEAM" | "JUDGE";
  displayName: string;
  teamId: string | null;
  judgeId: string | null;
  mustChangePassword: boolean;
};

function cookieOptions(req?: NextRequest) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: req ? forwardedProto(req) === "https" : process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: MAX_AGE,
  };
}

export async function openSession(userId: string, req?: NextRequest) {
  const issued = newSessionToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: issued.tokenHash,
      expiresAt: new Date(Date.now() + MAX_AGE * 1000),
    },
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, issued.cookie, cookieOptions(req));
  return { token: issued, res };
}

export function attachSessionCookie(res: NextResponse, cookieValue: string, req?: NextRequest) {
  res.cookies.set(COOKIE, cookieValue, cookieOptions(req));
}

export function clearSessionCookie(res: NextResponse, req?: NextRequest) {
  res.cookies.set(COOKIE, "", { ...cookieOptions(req), maxAge: 0 });
}

async function userFromToken(raw: string | undefined): Promise<SessionUser | null> {
  const parsed = parseSessionCookie(raw);
  if (!parsed) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: parsed.tokenHash },
    include: { user: { include: { judge: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  const user = session.user;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    teamId: user.teamId,
    judgeId: user.judge?.id ?? null,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return userFromToken(jar.get(COOKIE)?.value);
}

export async function sessionFromRequest(req: NextRequest) {
  return userFromToken(req.cookies.get(COOKIE)?.value);
}

export async function requireUser(
  req: NextRequest,
  roles?: SessionUser["role"][],
  options?: { allowDuringPasswordChange?: boolean },
) {
  const user = await sessionFromRequest(req);
  if (!user) throw new HttpError(401, "Sign in required.");
  if (user.mustChangePassword && !options?.allowDuringPasswordChange) {
    throw new HttpError(403, "Change your password before continuing.");
  }
  if (roles && !roles.includes(user.role)) throw new HttpError(403, "You do not have access to that.");
  return user;
}

export function homeFor(role: SessionUser["role"]) {
  if (role === "ADMIN") return "/admin";
  if (role === "JUDGE") return "/judge";
  return "/team";
}
