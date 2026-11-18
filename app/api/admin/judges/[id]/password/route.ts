import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { api, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { resetUserPassword } from "@/lib/squads";

export const POST = api(async (req, ctx) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const judge = await prisma.judge.findUnique({ where: { id }, include: { user: true } });
  if (!judge) return json({ error: "Judge not found." }, 404);
  const password = await resetUserPassword(judge.userId);
  await audit(admin, "judge.password", "judge", id, { username: judge.user.username });
  return json({ username: judge.user.username, password });
});
