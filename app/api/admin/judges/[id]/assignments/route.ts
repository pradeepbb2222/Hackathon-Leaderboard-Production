import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { api, json, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { TRACKS } from "@/lib/tracks";

const schema = z.object({
  teamIds: z.array(z.string()).optional(),
  track: z.enum(["LEARNING", "REGENERAX", "INSIGHT", "FARMING", "SOCIETAL"]).optional(),
  removeTeamId: z.string().optional(),
});

export const POST = api(async (req, ctx) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const judge = await prisma.judge.findUnique({ where: { id } });
  if (!judge) return json({ error: "Judge not found." }, 404);
  const body = schema.parse(await readJson(req));
  if (body.removeTeamId) {
    await prisma.judgeAssignment.deleteMany({ where: { judgeId: id, teamId: body.removeTeamId } });
    await audit(admin, "judge.unassign", "judge", id, { teamId: body.removeTeamId });
    return json({ ok: true });
  }
  let teamIds = body.teamIds ?? [];
  if (body.track) {
    const teams = await prisma.team.findMany({ where: { track: body.track }, select: { id: true } });
    teamIds = teams.map((team) => team.id);
  }
  if (!teamIds.length) return json({ error: "Choose a track or at least one squad." }, 400);
  const existing = await prisma.judgeAssignment.findMany({ where: { judgeId: id }, select: { teamId: true } });
  const have = new Set(existing.map((item) => item.teamId));
  const fresh = teamIds.filter((teamId) => !have.has(teamId));
  if (fresh.length) {
    await prisma.judgeAssignment.createMany({
      data: fresh.map((teamId) => ({ judgeId: id, teamId })),
    });
  }
  await audit(admin, "judge.assign", "judge", id, {
    count: teamIds.length,
    track: body.track ? TRACKS.find((track) => track.id === body.track)?.short : undefined,
  });
  return json({ ok: true, count: teamIds.length });
});
