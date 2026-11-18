import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { HttpError, api } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { zipResponse } from "@/lib/zip-files";

export const GET = api(async (req, ctx) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const milestone = await prisma.milestone.findUnique({
    where: { id },
    include: {
      submissions: {
        include: {
          team: true,
          files: { where: { confirmed: true } },
        },
      },
    },
  });
  if (!milestone) throw new HttpError(404, "Gate not found.");
  const files = milestone.submissions.flatMap((submission) =>
    submission.files.map((file, index) => ({
      storedName: file.storedName,
      nameInZip: `${milestone.code}/${submission.team.code}/${index + 1}-${file.originalName}`,
    })),
  );
  await audit(admin, "file.archive", "milestone", milestone.id, { code: milestone.code, files: files.length });
  return zipResponse(files, `${milestone.code}-files.zip`);
});
