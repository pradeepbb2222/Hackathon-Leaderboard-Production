import { requireUser } from "@/lib/auth";
import { getBoard } from "@/lib/board";
import { HttpError, api, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = api(async (req) => {
  const user = await requireUser(req, ["JUDGE"]);
  if (!user.judgeId) throw new HttpError(403, "This login is not a jury account.");
  const [assignments, scores, board] = await Promise.all([
    prisma.judgeAssignment.findMany({
      where: { judgeId: user.judgeId },
      include: { team: true },
      orderBy: { team: { code: "asc" } },
    }),
    prisma.judgeScore.findMany({ where: { judgeId: user.judgeId } }),
    getBoard(),
  ]);
  const scoreMap = new Map(scores.map((score) => [score.teamId, score]));
  const rankMap = new Map(board.rows.map((row) => [row.teamId, row]));
  return json({
    judge: user.displayName,
    teams: assignments.map((assignment) => {
      const score = scoreMap.get(assignment.teamId);
      const rank = rankMap.get(assignment.teamId);
      return {
        id: assignment.team.id,
        code: assignment.team.code,
        name: assignment.team.name,
        track: assignment.team.track,
        college: assignment.team.college,
        isFinalist: assignment.team.isFinalist,
        members: JSON.parse(assignment.team.members) as { name: string; role: string }[],
        scoreStatus: score?.status ?? "NONE",
        completedCount: rank?.completedCount ?? 0,
        progressScore: rank?.progressScore ?? 0,
      };
    }),
  });
});
