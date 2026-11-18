import { requireUser } from "@/lib/auth";
import { sendStoredFile } from "@/lib/file-send";
import { HttpError, api } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = api(async (req, ctx) => {
  const user = await requireUser(req, ["JUDGE"]);
  if (!user.judgeId) throw new HttpError(403, "This login is not a jury account.");
  const { fileId } = await ctx.params;
  const file = await prisma.submissionFile.findUnique({
    where: { id: fileId },
    include: { submission: true },
  });
  if (!file || !file.confirmed) throw new HttpError(404, "File not found.");
  const link = await prisma.judgeAssignment.findUnique({
    where: { judgeId_teamId: { judgeId: user.judgeId, teamId: file.submission.teamId } },
  });
  if (!link) throw new HttpError(404, "File not found.");
  return sendStoredFile(file);
});