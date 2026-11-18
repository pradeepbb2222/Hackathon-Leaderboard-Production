import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { api, json, readJson } from "@/lib/http";
import { publishBoard } from "@/lib/live";
import { prisma } from "@/lib/prisma";

export const GET = api(async (req) => {
  await requireUser(req, ["ADMIN"]);
  const milestones = await prisma.milestone.findMany({ orderBy: { sortOrder: "asc" } });
  return json({ milestones });
});

const item = z.object({
  id: z.string(),
  name: z.string().trim().min(3).max(80),
  summary: z.string().trim().min(3).max(280),
  openOffsetMin: z.number().int().min(0).max(20 * 60),
  closeOffsetMin: z.number().int().min(1).max(24 * 60),
  maxPoints: z.number().int().min(1).max(100),
  fileRequired: z.boolean(),
  requireGithub: z.boolean(),
  requireDemo: z.boolean(),
  requireVideo: z.boolean(),
});

export const PATCH = api(async (req) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const body = z.object({ milestones: z.array(item).min(1) }).parse(await readJson(req));
  for (const milestone of body.milestones) {
    if (milestone.closeOffsetMin <= milestone.openOffsetMin) {
      return json({ error: `${milestone.name} must close after it opens.` }, 400);
    }
  }
  await prisma.$transaction(
    body.milestones.map((milestone) =>
      prisma.milestone.update({
        where: { id: milestone.id },
        data: {
          name: milestone.name,
          summary: milestone.summary,
          openOffsetMin: milestone.openOffsetMin,
          closeOffsetMin: milestone.closeOffsetMin,
          maxPoints: milestone.maxPoints,
          fileRequired: milestone.fileRequired,
          requireGithub: milestone.requireGithub,
          requireDemo: milestone.requireDemo,
          requireVideo: milestone.requireVideo,
        },
      }),
    ),
  );
  await audit(admin, "milestones.update", "milestone", null, { count: body.milestones.length });
  await publishBoard();
  return json({ ok: true });
});
