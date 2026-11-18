import { requireUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { api } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { trackById } from "@/lib/tracks";

export const GET = api(async (req) => {
  await requireUser(req, ["ADMIN"]);
  const teams = await prisma.team.findMany({
    orderBy: { code: "asc" },
    include: { user: true },
  });
  const csv = toCsv(
    ["team_id", "team_name", "track", "college", "members", "username", "password"],
    teams.map((team) => {
      const members = (JSON.parse(team.members) as { name: string }[]).map((member) => member.name).join("; ");
      return [
        team.code,
        team.name,
        trackById(team.track).short,
        team.college,
        members,
        team.user?.username ?? team.code,
        team.user?.issuedPassword ?? "",
      ];
    }),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=codebharat-2026-credentials.csv",
      "Cache-Control": "no-store",
    },
  });
});
