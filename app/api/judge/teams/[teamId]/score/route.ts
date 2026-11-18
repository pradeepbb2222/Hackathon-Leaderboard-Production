import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { HttpError, api, json, readJson } from "@/lib/http";
import { publishBoard } from "@/lib/live";
import { prisma } from "@/lib/prisma";

const score = z.number().int().min(0).max(10);
const schema = z.object({
  engineering: score,
  impact: score,
  prototype: score,
  vision: score,
  engineeringNote: z.string().max(1000).optional(),
  impactNote: z.string().max(1000).optional(),
  prototypeNote: z.string().max(1000).optional(),
  visionNote: z.string().max(1000).optional(),
  overallComment: z.string().max(2000).optional(),
  submit: z.boolean(),
});

export const PUT = api(async (req, ctx) => {
  const user = await requireUser(req, ["JUDGE"]);
  if (!user.judgeId) throw new HttpError(403, "This login is not a jury account.");
  const { teamId } = await ctx.params;
  const link = await prisma.judgeAssignment.findUnique({
    where: { judgeId_teamId: { judgeId: user.judgeId, teamId } },
  });
  if (!link) throw new HttpError(404, "That squad is not on your list.");
  const state = await prisma.eventState.findUniqueOrThrow({ where: { id: "event" } });
  if (state.submissionsLocked) throw new HttpError(403, "Scoring is locked by ops.");
  const body = schema.parse(await readJson(req));
  const note = (value?: string) => (value ?? "").trim();
  const saved = await prisma.judgeScore.upsert({
    where: { judgeId_teamId: { judgeId: user.judgeId, teamId } },
    create: {
      judgeId: user.judgeId,
      teamId,
      engineering: body.engineering,
      impact: body.impact,
      prototype: body.prototype,
      vision: body.vision,
      engineeringNote: note(body.engineeringNote),
      impactNote: note(body.impactNote),
      prototypeNote: note(body.prototypeNote),
      visionNote: note(body.visionNote),
      overallComment: note(body.overallComment),
      status: body.submit ? "SUBMITTED" : "DRAFT",
      submittedAt: body.submit ? new Date() : null,
    },
    update: {
      engineering: body.engineering,
      impact: body.impact,
      prototype: body.prototype,
      vision: body.vision,
      engineeringNote: note(body.engineeringNote),
      impactNote: note(body.impactNote),
      prototypeNote: note(body.prototypeNote),
      visionNote: note(body.visionNote),
      overallComment: note(body.overallComment),
      status: body.submit ? "SUBMITTED" : "DRAFT",
      submittedAt: body.submit ? new Date() : undefined,
    },
  });
  await audit(user, body.submit ? "score.submit" : "score.draft", "score", saved.id, { teamId });
  if (body.submit) await publishBoard();
  return json({ ok: true, status: saved.status });
});
