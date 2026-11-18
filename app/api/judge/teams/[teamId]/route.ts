import { requireUser } from "@/lib/auth";
import { milestoneState, readClock } from "@/lib/clock";
import { HttpError, api, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";

async function assigned(judgeId: string, teamId: string) {
  const link = await prisma.judgeAssignment.findUnique({
    where: { judgeId_teamId: { judgeId, teamId } },
  });
  if (!link) throw new HttpError(404, "That squad is not on your list.");
}

export const GET = api(async (req, ctx) => {
  const user = await requireUser(req, ["JUDGE"]);
  if (!user.judgeId) throw new HttpError(403, "This login is not a jury account.");
  const { teamId } = await ctx.params;
  await assigned(user.judgeId, teamId);
  const [team, milestones, state, score] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      include: {
        submissions: {
          include: { files: { where: { confirmed: true }, orderBy: { uploadedAt: "desc" } }, revisions: { orderBy: { createdAt: "desc" }, take: 6 } },
        },
      },
    }),
    prisma.milestone.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.eventState.findUniqueOrThrow({ where: { id: "event" } }),
    prisma.judgeScore.findUnique({ where: { judgeId_teamId: { judgeId: user.judgeId, teamId } } }),
  ]);
  if (!team) throw new HttpError(404, "Squad not found.");
  const clock = readClock(state);
  return json({
    team: {
      id: team.id,
      code: team.code,
      name: team.name,
      track: team.track,
      college: team.college,
      members: JSON.parse(team.members),
      isFinalist: team.isFinalist,
    },
    locked: state.submissionsLocked,
    milestones: milestones.map((milestone) => {
      const submission = team.submissions.find((item) => item.milestoneId === milestone.id);
      return {
        id: milestone.id,
        code: milestone.code,
        name: milestone.name,
        summary: milestone.summary,
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
              })),
              history: submission.revisions.map((revision) => ({
                id: revision.id,
                progress: revision.progress,
                statusText: revision.statusText,
                at: revision.createdAt.toISOString(),
                actorName: revision.actorName,
              })),
            }
          : null,
      };
    }),
    score: score
      ? {
          engineering: score.engineering,
          impact: score.impact,
          prototype: score.prototype,
          vision: score.vision,
          engineeringNote: score.engineeringNote,
          impactNote: score.impactNote,
          prototypeNote: score.prototypeNote,
          visionNote: score.visionNote,
          overallComment: score.overallComment,
          status: score.status,
          submittedAt: score.submittedAt?.toISOString() ?? null,
        }
      : null,
  });
});
