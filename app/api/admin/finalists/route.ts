import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getBoard } from "@/lib/board";
import { api, json, readJson } from "@/lib/http";
import { publishBoard } from "@/lib/live";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  mode: z.enum(["top25", "clear", "toggle"]),
  teamId: z.string().optional(),
});

export const POST = api(async (req) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const body = schema.parse(await readJson(req));
  if (body.mode === "clear") {
    await prisma.team.updateMany({ data: { isFinalist: false } });
    await audit(admin, "finalists.clear", "team");
  } else if (body.mode === "top25") {
    const board = await getBoard(true);
    const ids = board.rows.slice(0, 25).map((row) => row.teamId);
    await prisma.$transaction([
      prisma.team.updateMany({ data: { isFinalist: false } }),
      prisma.team.updateMany({ where: { id: { in: ids } }, data: { isFinalist: true } }),
    ]);
    await audit(admin, "finalists.top25", "team", null, { count: ids.length });
  } else {
    if (!body.teamId) return json({ error: "Choose a squad." }, 400);
    const team = await prisma.team.findUnique({ where: { id: body.teamId } });
    if (!team) return json({ error: "Squad not found." }, 404);
    await prisma.team.update({ where: { id: team.id }, data: { isFinalist: !team.isFinalist } });
    await audit(admin, "finalists.toggle", "team", team.id, { code: team.code, isFinalist: !team.isFinalist });
  }
  await publishBoard();
  const count = await prisma.team.count({ where: { isFinalist: true } });
  return json({ ok: true, finalists: count });
});
