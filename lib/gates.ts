import { milestoneState, readClock } from "@/lib/clock";
import { HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { SPRINT_MINUTES } from "@/lib/tracks";

export async function loadGate(milestoneId: string) {
  const [state, milestone] = await Promise.all([
    prisma.eventState.findUnique({ where: { id: "event" } }),
    prisma.milestone.findUnique({ where: { id: milestoneId } }),
  ]);
  if (!state || !milestone) throw new HttpError(404, "That gate does not exist.");
  if (state.submissionsLocked) throw new HttpError(403, "Submissions are locked by ops.");
  const clock = readClock(state);
  if (clock.elapsedMs >= SPRINT_MINUTES * 60 * 1000) {
    throw new HttpError(403, "Code freeze. This gate no longer accepts updates.");
  }
  const window = milestoneState(milestone.openOffsetMin, milestone.closeOffsetMin, clock.elapsedMs);
  if (window === "upcoming") throw new HttpError(403, "This gate is not open yet.");
  return { state, milestone, clock, isLate: window === "closed" };
}
