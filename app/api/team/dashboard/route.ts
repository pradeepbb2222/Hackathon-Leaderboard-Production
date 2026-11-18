import { requireUser } from "@/lib/auth";
import { getBoard } from "@/lib/board";
import { milestoneState, readClock } from "@/lib/clock";
import { HttpError, api, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = api(async (req) => {
  const user = await requireUser(req, ["TEAM"]);
  if (!user.teamId) throw new HttpError(403, "This login is not attached to a squad.");
  const [team, milestones, state, announcements, board] = await Promise.all([
    prisma.team.findUniqueOrThrow({
      where: { id: user.teamId },
      include: {
        submissions: {
          include: {
            files: { where: { confirmed: true }, orderBy: { uploadedAt: "desc" } },
            revisions: { orderBy: { createdAt: "desc" }, take: 12 },
          },
        },
        scores: {
          where: { status: "SUBMITTED" },
          include: { judge: { include: { user: { select: { displayName: true } } } } },
        },
      },
    }),
    prisma.milestone.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.eventState.findUniqueOrThrow({ where: { id: "event" } }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    getBoard(),
  ]);
  const used = team.submissions.reduce(
    (sum, submission) => sum + submission.files.reduce((inner, file) => inner + file.sizeBytes, 0),
    0,
  );
  const quotaMb = (await prisma.team.findUnique({ where: { id: team.id }, select: { quotaMb: true } }))?.quotaMb
    ?? Number(process.env.TEAM_QUOTA_MB || 500);
  const clock = readClock(state);
  const row = board.rows.find((item) => item.teamId === team.id);
  return json({
    team: {
      code: team.code,
      name: team.name,
      track: team.track,
      college: team.college,
      members: JSON.parse(team.members),
      isFinalist: team.isFinalist,
    },
    rank: row ? { place: row.rank, previous: row.previousRank, of: board.rows.length, total: row.total, progress: row.progressScore, judge: row.judgeScore } : null,
    clock,
    locked: state.submissionsLocked,
    feedbackReleased: state.feedbackReleased,
    limits: {
      fileMb: Number(process.env.FILE_SIZE_LIMIT_MB || 25),
      quotaMb,
      usedMb: Math.round((used / (1024 * 1024)) * 10) / 10,
    },
    milestones: milestones.map((milestone) => {
      const submission = team.submissions.find((item) => item.milestoneId === milestone.id);
      return {
        id: milestone.id,
        code: milestone.code,
        name: milestone.name,
        summary: milestone.summary,
        maxPoints: milestone.maxPoints,
        openOffsetMin: milestone.openOffsetMin,
        closeOffsetMin: milestone.closeOffsetMin,
        fileRequired: milestone.fileRequired,
        requireGithub: milestone.requireGithub,
        requireDemo: milestone.requireDemo,
        requireVideo: milestone.requireVideo,
        state: milestoneState(milestone.openOffsetMin, milestone.closeOffsetMin, clock.elapsedMs),
        submission: submission
          ? {
              statusText: submission.statusText,
              progress: submission.progress,
              githubUrl: submission.githubUrl,
              demoUrl: submission.demoUrl,
              videoUrl: submission.videoUrl,
              isLate: submission.isLate,
              lastActivityAt: submission.lastActivityAt.toISOString(),
              files: submission.files.map((file) => ({
                id: file.id,
                name: file.originalName,
                size: file.sizeBytes,
                uploadedAt: file.uploadedAt.toISOString(),
              })),
              history: submission.revisions.map((revision) => ({
                id: revision.id,
                progress: revision.progress,
                statusText: revision.statusText,
                isLate: revision.isLate,
                actorName: revision.actorName,
                at: revision.createdAt.toISOString(),
              })),
            }
          : null,
      };
    }),
    feedback: state.feedbackReleased
      ? team.scores.map((score) => ({
          judge: score.judge.user.displayName,
          title: score.judge.title,
          engineering: score.engineering,
          impact: score.impact,
          prototype: score.prototype,
          vision: score.vision,
          engineeringNote: score.engineeringNote,
          impactNote: score.impactNote,
          prototypeNote: score.prototypeNote,
          visionNote: score.visionNote,
          overallComment: score.overallComment,
        }))
      : [],
    announcements: announcements.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      createdAt: item.createdAt.toISOString(),
    })),
  });
});
