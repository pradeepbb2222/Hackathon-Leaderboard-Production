import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { api, json, readJson } from "@/lib/http";
import { publishBoard } from "@/lib/live";
import { prisma } from "@/lib/prisma";

export const GET = api(async (req, ctx) => {
  await requireUser(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, issuedPassword: true } },
      submissions: {
        include: {
          milestone: true,
          files: { where: { confirmed: true }, orderBy: { uploadedAt: "desc" } },
          revisions: { orderBy: { createdAt: "desc" }, take: 8 },
        },
        orderBy: { milestone: { sortOrder: "asc" } },
      },
      scores: { include: { judge: { include: { user: true } } } },
    },
  });
  if (!team) return json({ error: "Squad not found." }, 404);
  return json({
    team: {
      id: team.id,
      code: team.code,
      name: team.name,
      track: team.track,
      college: team.college,
      members: JSON.parse(team.members),
      isFinalist: team.isFinalist,
      username: team.user?.username,
      password: team.user?.issuedPassword ?? "",
      submissions: team.submissions.map((submission) => ({
        id: submission.id,
        milestoneId: submission.milestoneId,
        code: submission.milestone.code,
        name: submission.milestone.name,
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
      })),
      scores: team.scores.map((score) => ({
        id: score.id,
        judge: score.judge.user.displayName,
        title: score.judge.title,
        status: score.status,
        engineering: score.engineering,
        impact: score.impact,
        prototype: score.prototype,
        vision: score.vision,
        engineeringNote: score.engineeringNote,
        impactNote: score.impactNote,
        prototypeNote: score.prototypeNote,
        visionNote: score.visionNote,
        overallComment: score.overallComment,
        submittedAt: score.submittedAt?.toISOString() ?? null,
      })),
    },
  });
});

const patchSchema = z.object({ isFinalist: z.boolean().optional(), name: z.string().min(2).max(60).optional(), college: z.string().min(2).max(80).optional() });

export const PATCH = api(async (req, ctx) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const body = patchSchema.parse(await readJson(req));
  const team = await prisma.team.update({ where: { id }, data: body });
  await audit(admin, "team.update", "team", id, body);
  await publishBoard();
  return json({ ok: true, isFinalist: team.isFinalist });
});

export const DELETE = api(async (req, ctx) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) return json({ error: "Squad not found." }, 404);
  await prisma.team.delete({ where: { id } });
  await audit(admin, "team.delete", "team", id, { code: team.code });
  await publishBoard();
  return json({ ok: true });
});
