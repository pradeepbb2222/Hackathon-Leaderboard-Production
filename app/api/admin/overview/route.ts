import { requireUser } from "@/lib/auth";
import { getBoard } from "@/lib/board";
import { readClock } from "@/lib/clock";
import { api, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { TRACKS } from "@/lib/tracks";

export const GET = api(async (req) => {
  await requireUser(req, ["ADMIN"]);
  const [teams, judges, submissions, files, finalists, audits, state, milestones, board] = await Promise.all([
    prisma.team.count(),
    prisma.judge.count(),
    prisma.submission.count(),
    prisma.submissionFile.count({ where: { confirmed: true } }),
    prisma.team.count({ where: { isFinalist: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.eventState.findUniqueOrThrow({ where: { id: "event" } }),
    prisma.milestone.findMany({ orderBy: { sortOrder: "asc" } }),
    getBoard(),
  ]);
  const byTrack = TRACKS.map((track) => ({
    id: track.id,
    short: track.short,
    count: board.rows.filter((row) => row.track === track.id).length,
  }));
  const completion = milestones.map((milestone) => ({
    id: milestone.id,
    code: milestone.code,
    name: milestone.name,
    completed: board.rows.filter((row) => row.milestones.find((dot) => dot.id === milestone.id)?.completed).length,
  }));
  return json({
    teams,
    judges,
    submissions,
    files,
    finalists,
    byTrack,
    completion,
    audits,
    clock: readClock(state),
    event: {
      startsAt: state.startsAt.toISOString(),
      paused: state.paused,
      showCountdown: state.showCountdown,
      submissionsLocked: state.submissionsLocked,
      leaderboardHidden: state.leaderboardHidden,
      leaderboardFrozen: state.leaderboardFrozen,
      feedbackReleased: state.feedbackReleased,
      progressWeight: state.progressWeight,
      judgeWeight: state.judgeWeight,
      simulationEnabled: state.simulationEnabled,
      venue: state.venue,
      theme: state.theme,
    },
    leaders: board.rows.slice(0, 5).map((row) => ({
      rank: row.rank,
      code: row.code,
      name: row.name,
      college: row.college,
      total: row.total,
    })),
  });
});
