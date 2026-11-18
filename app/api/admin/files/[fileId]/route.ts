import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendStoredFile } from "@/lib/file-send";
import { HttpError, api } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = api(async (req, ctx) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const { fileId } = await ctx.params;
  const file = await prisma.submissionFile.findUnique({
    where: { id: fileId },
    include: { submission: { include: { team: true } } },
  });
  if (!file || !file.confirmed) throw new HttpError(404, "File not found.");
  await audit(admin, "file.download", "file", file.id, { team: file.submission.team.code, name: file.originalName });
  return sendStoredFile(file);
});
