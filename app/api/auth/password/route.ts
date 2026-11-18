import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { api, json, readJson } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(80),
});

export const POST = api(async (req) => {
  const user = await requireUser(req, undefined, { allowDuringPasswordChange: true });
  const body = schema.parse(await readJson(req));
  if (body.newPassword === body.currentPassword) {
    return json({ error: "Choose a password that is different from the temporary one." }, 400);
  }
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const match = await verifyPassword(body.currentPassword, row.passwordHash);
  if (!match) return json({ error: "The current password is not correct." }, 401);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(body.newPassword),
      issuedPassword: user.role === "ADMIN" ? null : body.newPassword,
      mustChangePassword: false,
    },
  });
  await audit(user, "auth.password", "user", user.id);
  return json({ ok: true });
});
