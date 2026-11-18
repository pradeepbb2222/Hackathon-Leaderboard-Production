import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getBoard } from "@/lib/board";
import { api, json, readJson } from "@/lib/http";
import { publishBoard } from "@/lib/live";
import { prisma } from "@/lib/prisma";
import { createSquad } from "@/lib/squads";

export const GET = api(async (req) => {
  await requireUser(req, ["ADMIN"]);
  const [teams, board] = await Promise.all([
    prisma.team.findMany({ orderBy: { code: "asc" }, include: { user: { select: { username: true, issuedPassword: true } } } }),
    getBoard(),
  ]);
  const ranks = new Map(board.rows.map((row) => [row.teamId, row]));
  return json({
    teams: teams.map((team) => {
      const rank = ranks.get(team.id);
      return {
        id: team.id,
        code: team.code,
        name: team.name,
        track: team.track,
        college: team.college,
        members: JSON.parse(team.members) as { name: string; role: string }[],
        isFinalist: team.isFinalist,
        username: team.user?.username ?? team.code,
        password: team.user?.issuedPassword ?? "",
        rank: rank?.rank ?? null,
        total: rank?.total ?? null,
        progressScore: rank?.progressScore ?? null,
        completedCount: rank?.completedCount ?? 0,
      };
    }),
  });
});

const createSchema = z.object({
  name: z.string(),
  track: z.string(),
  college: z.string(),
  members: z.string(),
  password: z.string().optional(),
});

export const POST = api(async (req) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const body = createSchema.parse(await readJson(req));
  const created = await createSquad(body);
  await audit(admin, "team.create", "team", created.team.id, { code: created.username });
  await publishBoard();
  return json({
    team: { id: created.team.id, code: created.username, name: created.team.name },
    username: created.username,
    password: created.password,
  });
});
