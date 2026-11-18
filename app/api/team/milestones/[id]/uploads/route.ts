import crypto from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loadGate } from "@/lib/gates";
import { HttpError, api, json, readJson } from "@/lib/http";
import { sha256 } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { storagePresignPut } from "@/lib/storage";
import { checkUpload, safeOriginalName } from "@/lib/uploads";
import { MAX_FILES_PER_MILESTONE } from "@/lib/tracks";

const schema = z.object({
  fileName: z.string().min(1).max(180),
  contentType: z.string().max(120).optional(),
  size: z.number().int().positive(),
});

async function usedBytes(teamId: string) {
  const files = await prisma.submissionFile.findMany({
    where: {
      submission: { teamId },
      OR: [{ confirmed: true }, { confirmed: false, tokenExpiresAt: { gt: new Date() } }],
    },
    select: { sizeBytes: true },
  });
  return files.reduce((sum, file) => sum + file.sizeBytes, 0);
}

export const POST = api(async (req, ctx) => {
  const user = await requireUser(req, ["TEAM"]);
  if (!user.teamId) throw new HttpError(403, "This login is not attached to a squad.");
  const limited = rateLimit(`upload:${user.id}:${clientKey(req.headers)}`, 40, 10 * 60 * 1000);
  if (!limited.ok) throw new HttpError(429, "Too many uploads. Wait a moment and try again.");
  const { id } = await ctx.params;
  const body = schema.parse(await readJson(req));
  const checked = checkUpload(body.fileName, body.contentType || "", body.size);
  if (!checked.ok) throw new HttpError(400, checked.error);
  const { milestone, isLate } = await loadGate(id);
  const team = await prisma.team.findUniqueOrThrow({ where: { id: user.teamId } });
  const quotaMb = team.quotaMb ?? Number(process.env.TEAM_QUOTA_MB || 500);
  const quota = quotaMb * 1024 * 1024;
  if ((await usedBytes(user.teamId)) + body.size > quota) {
    throw new HttpError(400, `This squad is over its ${quotaMb} MB file quota.`);
  }
  const existing = await prisma.submission.findUnique({
    where: { teamId_milestoneId: { teamId: user.teamId, milestoneId: id } },
    include: { _count: { select: { files: { where: { confirmed: true } } } } },
  });
  if ((existing?._count.files ?? 0) >= MAX_FILES_PER_MILESTONE) {
    throw new HttpError(400, `This gate already has ${MAX_FILES_PER_MILESTONE} files.`);
  }
  const submission = existing
    ? await prisma.submission.update({
        where: { id: existing.id },
        data: { isLate: existing.isLate || isLate, lastActivityAt: new Date() },
      })
    : await prisma.submission.create({
        data: { teamId: user.teamId, milestoneId: id, isLate, statusText: "File uploaded.", lastActivityAt: new Date() },
      });
  const ext = checked.ext;
  const storedName = `${user.teamId}/${id}/${crypto.randomBytes(16).toString("hex")}.${ext}`;
  const token = crypto.randomBytes(24).toString("hex");
  const file = await prisma.submissionFile.create({
    data: {
      submissionId: submission.id,
      originalName: safeOriginalName(body.fileName),
      storedName,
      mimeType: checked.contentType,
      sizeBytes: body.size,
      confirmed: false,
      tokenHash: sha256(token),
      tokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  const presigned = await storagePresignPut(storedName, checked.contentType);
  await audit(user, "file.sign", "file", file.id, { milestone: milestone.code, name: file.originalName, size: body.size });
  return json({
    fileId: file.id,
    uploadUrl: presigned?.url ?? `/api/uploads/local/${token}`,
    headers: presigned?.headers ?? { "Content-Type": checked.contentType },
    isLate: submission.isLate,
  });
});
