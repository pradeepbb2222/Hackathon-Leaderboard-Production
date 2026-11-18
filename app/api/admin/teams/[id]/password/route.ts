import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { api, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { resetUserPassword } from "@/lib/squads";

export const POST = api(async (req, ctx) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const user = await prisma.user.findUnique({ where: { teamId: id } });
  if (!user) return json({ error: "That squad has no login." }, 404);
  const password = await resetUserPassword(user.id);
  await audit(admin, "team.password", "team", id, { username: user.username });
  return json({ username: user.username, password });
});
