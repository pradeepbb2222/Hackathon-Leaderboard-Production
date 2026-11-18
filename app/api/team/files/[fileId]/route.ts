import { requireUser } from "@/lib/auth";
import { sendStoredFile } from "@/lib/file-send";
import { HttpError, api } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = api(async (req, ctx) => {
  const user = await requireUser(req, ["TEAM"]);
  if (!user.teamId) throw new HttpError(403, "This login is not attached to a squad.");
  const { fileId } = await ctx.params;
  const file = await prisma.submissionFile.findUnique({
    where: { id: fileId },
    include: { submission: true },
  });
  if (!file || !file.confirmed || file.submission.teamId !== user.teamId) throw new HttpError(404, "File not found.");
  return sendStoredFile(file);
});
