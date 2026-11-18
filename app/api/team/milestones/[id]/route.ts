import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loadGate } from "@/lib/gates";
import { HttpError, api, json, readJson } from "@/lib/http";
import { cleanUrl } from "@/lib/links";
import { publishBoard } from "@/lib/live";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  statusText: z.string().max(2000).optional(),
  progress: z.number().int().min(0).max(100),
  githubUrl: z.string().max(300).optional(),
  demoUrl: z.string().max(300).optional(),
  videoUrl: z.string().max(300).optional(),
});

export const PUT = api(async (req, ctx) => {
  const user = await requireUser(req, ["TEAM"]);
  if (!user.teamId) throw new HttpError(403, "This login is not attached to a squad.");
  const { id } = await ctx.params;
  const body = schema.parse(await readJson(req));
  const { milestone, isLate } = await loadGate(id);
  const statusText = (body.statusText ?? "").trim();
  if (milestone.requireStatus && statusText.length < 8) {
    throw new HttpError(400, "Write a status update of at least a sentence.");
  }
  const githubUrl = cleanUrl(body.githubUrl, "GitHub");
  const demoUrl = cleanUrl(body.demoUrl, "Demo link");
  const videoUrl = cleanUrl(body.videoUrl, "Video link");
  if (body.progress >= 100 && milestone.requireGithub && !githubUrl) {
    throw new HttpError(400, "A GitHub link is required to mark this gate complete.");
  }
  if (body.progress >= 100 && milestone.requireDemo && !demoUrl) {
    throw new HttpError(400, "A demo link is required to mark this gate complete.");
  }
  if (body.progress >= 100 && milestone.requireVideo && !videoUrl) {
    throw new HttpError(400, "A video link is required to mark this gate complete.");
  }
  const existing = await prisma.submission.findUnique({
    where: { teamId_milestoneId: { teamId: user.teamId, milestoneId: id } },
    include: { files: true },
  });
  if (body.progress >= 100 && milestone.fileRequired && !existing?.files.length) {
    throw new HttpError(400, "Upload the required file before marking this gate complete.");
  }
  const saved = await prisma.submission.upsert({
    where: { teamId_milestoneId: { teamId: user.teamId, milestoneId: id } },
    create: {
      teamId: user.teamId,
      milestoneId: id,
      statusText,
      progress: body.progress,
      githubUrl,
      demoUrl,
      videoUrl,
      isLate,
      lastActivityAt: new Date(),
    },
    update: {
      statusText,
      progress: body.progress,
      githubUrl,
      demoUrl,
      videoUrl,
      isLate: Boolean(existing?.isLate) || isLate,
      lastActivityAt: new Date(),
    },
  });
  await prisma.submissionRevision.create({
    data: {
      submissionId: saved.id,
      statusText,
      progress: body.progress,
      githubUrl,
      demoUrl,
      videoUrl,
      isLate: saved.isLate,
      actorName: user.displayName,
    },
  });
  await audit(user, "submission.save", "submission", saved.id, {
    milestone: milestone.code,
    progress: body.progress,
    late: saved.isLate,
  });
  await publishBoard();
  return json({ ok: true, isLate: saved.isLate, progress: saved.progress });
});
