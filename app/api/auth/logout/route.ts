import { COOKIE, clearSessionCookie, sessionFromRequest } from "@/lib/auth";
import { api, json } from "@/lib/http";
import { parseSessionCookie } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

export const POST = api(async (req) => {
  const parsed = parseSessionCookie(req.cookies.get(COOKIE)?.value);
  if (parsed) await prisma.session.deleteMany({ where: { tokenHash: parsed.tokenHash } });
  await sessionFromRequest(req);
  const res = json({ ok: true });
  clearSessionCookie(res, req);
  return res;
});
