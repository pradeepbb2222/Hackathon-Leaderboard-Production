import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { HttpError, api, json } from "@/lib/http";
import { publishBoard } from "@/lib/live";
import { prisma } from "@/lib/prisma";
import { storageDelete, storageHead } from "@/lib/storage";
import { fileLimitBytes } from "@/lib/uploads";

export const POST = api(async (req, ctx) => {
  const user = await requireUser(req, ["TEAM"]);
  if (!user.teamId) throw new HttpError(403, "This login is not attached to a squad.");
  const { id, fileId } = await ctx.params;
  const file = await prisma.submissionFile.findUnique({
    where: { id: fileId },
    include: { submission: true },
  });
  if (!file || file.submission.teamId !== user.teamId || file.submission.milestoneId !== id) {
    throw new HttpError(404, "That upload was not found.");
  }
  if (file.confirmed) return json({ ok: true, file: { id: file.id, name: file.originalName, size: file.sizeBytes } });
  const stat = await storageHead(file.storedName);
  if (!stat) throw new HttpError(400, "The file did not arrive. Try the upload again.");
  if (stat.size <= 0 || stat.size > fileLimitBytes() || stat.size !== file.sizeBytes) {
    await storageDelete(file.storedName);
    await prisma.submissionFile.delete({ where: { id: file.id } });
    throw new HttpError(400, "The uploaded file size did not match. Choose the file again.");
  }
  await prisma.submissionFile.update({
    where: { id: file.id },
    data: { confirmed: true, tokenHash: null, tokenExpiresAt: null },
  });
  await audit(user, "file.upload", "file", file.id, { name: file.originalName, size: stat.size });
  await publishBoard();
  return json({ ok: true, file: { id: file.id, name: file.originalName, size: stat.size } });
});
