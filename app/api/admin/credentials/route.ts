import { requireUser } from "@/lib/auth";
import { api, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = api(async (req) => {
  await requireUser(req, ["ADMIN"]);
  const teams = await prisma.team.findMany({
    orderBy: { code: "asc" },
    include: { user: true },
  });
  return json({
    cards: teams.map((team) => ({
      code: team.code,
      name: team.name,
      track: team.track,
      college: team.college,
      members: JSON.parse(team.members) as { name: string; role: string }[],
      username: team.user?.username ?? team.code,
      password: team.user?.issuedPassword ?? "",
    })),
  });
});
