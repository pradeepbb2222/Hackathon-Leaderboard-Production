import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { freezeCurrentBoard, invalidateBoard } from "@/lib/board";
import { api, json, readJson } from "@/lib/http";
import { publishBoard } from "@/lib/live";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  startsAt: z.string().datetime().optional(),
  paused: z.boolean().optional(),
  showCountdown: z.boolean().optional(),
  submissionsLocked: z.boolean().optional(),
  leaderboardHidden: z.boolean().optional(),
  leaderboardFrozen: z.boolean().optional(),
  feedbackReleased: z.boolean().optional(),
  progressWeight: z.number().int().min(0).max(100).optional(),
  judgeWeight: z.number().int().min(0).max(100).optional(),
  simulationEnabled: z.boolean().optional(),
  preset: z.enum(["hour2", "hour6", "hour19", "hour20"]).optional(),
});

const PRESET_HOURS = { hour2: 2, hour6: 6 + 20 / 60, hour19: 19, hour20: 20 };

export const PATCH = api(async (req) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const body = schema.parse(await readJson(req));
  const state = await prisma.eventState.findUniqueOrThrow({ where: { id: "event" } });
  if (
    body.progressWeight != null &&
    body.judgeWeight != null &&
    body.progressWeight + body.judgeWeight === 0
  ) {
    return json({ error: "Scoring weights cannot both be zero." }, 400);
  }

  if (body.leaderboardFrozen === true && !state.leaderboardFrozen) {
    await freezeCurrentBoard();
    await audit(admin, "board.freeze", "event", "event");
  }

  const data: Record<string, unknown> = {};
  if (body.preset) {
    data.startsAt = new Date(Date.now() - PRESET_HOURS[body.preset] * 3600 * 1000);
    data.paused = false;
    data.pausedAt = null;
    data.accumulatedPauseMs = 0;
    data.leaderboardFrozen = false;
    data.frozenSnapshot = "";
  }
  if (body.startsAt) data.startsAt = new Date(body.startsAt);
  if (body.paused === true && !state.paused) {
    data.paused = true;
    data.pausedAt = new Date();
  }
  if (body.paused === false && state.paused) {
    data.paused = false;
    data.accumulatedPauseMs = state.accumulatedPauseMs + (Date.now() - (state.pausedAt?.getTime() ?? Date.now()));
    data.pausedAt = null;
  }
  for (const key of ["showCountdown", "submissionsLocked", "leaderboardHidden", "feedbackReleased", "simulationEnabled", "progressWeight", "judgeWeight"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.leaderboardFrozen === false) {
    data.leaderboardFrozen = false;
    data.frozenSnapshot = "";
  }
  if (Object.keys(data).length) {
    await prisma.eventState.update({ where: { id: "event" }, data });
  }
  await audit(admin, "event.update", "event", "event", body);
  invalidateBoard();
  await publishBoard();
  return json({ ok: true });
});
