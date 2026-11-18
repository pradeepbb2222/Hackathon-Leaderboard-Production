import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { HttpError, api } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { zipResponse } from "@/lib/zip-files";

export const GET = api(async (req, ctx) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      submissions: {
        include: {
          milestone: true,
          files: { where: { confirmed: true } },
        },
      },
    },
  });
  if (!team) throw new HttpError(404, "Squad not found.");
  const files = team.submissions.flatMap((submission) =>
    submission.files.map((file, index) => ({
      storedName: file.storedName,
      nameInZip: `${team.code}/${submission.milestone.code}/${index + 1}-${file.originalName}`,
    })),
  );
  await audit(admin, "file.archive", "team", team.id, { code: team.code, files: files.length });
  return zipResponse(files, `${team.code}-files.zip`);
});
