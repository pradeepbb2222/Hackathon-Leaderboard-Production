import { z } from "zod";
import { audit } from "@/lib/audit";
import { attachSessionCookie, homeFor } from "@/lib/auth";
import { api, fail, json, readJson, HttpError } from "@/lib/http";
import { newSessionToken, verifyPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
});

export const POST = api(async (req) => {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return fail("Enter your username and password.");
  const username = parsed.data.username;
  const ip = clientKey(req.headers);
  const key = `login:${ip}:${username.toLowerCase()}`;
  const limited = rateLimit(key, 8, 10 * 60 * 1000, false);
  if (!limited.ok) throw new HttpError(429, `Too many sign-in attempts. Wait ${limited.retryAfter}s and try again.`);
  const user = await prisma.user.findUnique({ where: { username } });
  const match = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !match) {
    rateLimit(key, 8, 10 * 60 * 1000);
    return fail("Those credentials were not recognized.", 401);
  }
  const issued = newSessionToken();
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: issued.tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await audit(
    { id: user.id, displayName: user.displayName },
    "auth.login",
    "user",
    user.id,
    { role: user.role },
  );
  const redirect = user.mustChangePassword ? "/account/password" : homeFor(user.role);
  const res = json({ ok: true, role: user.role, redirect, mustChangePassword: user.mustChangePassword });
  attachSessionCookie(res, issued.cookie, req);
  return res;
});
