import { requestPublish } from "@/lib/bus";
import { milestoneState, readClock } from "@/lib/clock";
import { prisma } from "@/lib/prisma";

const globalSim = globalThis as unknown as { cbSim?: NodeJS.Timeout };

const NOTES = [
  "Core path is running on sample data.",
  "Wiring the demo script for the floor.",
  "Cut scope to protect the working slice.",
  "Schema locked, now filling the empty states.",
  "Checkpoint saved. Next slice is the public flow.",
];

export function startSimulator() {
  if (globalSim.cbSim) return;
  globalSim.cbSim = setInterval(() => {
    void tick().catch((error) => console.error("simulator", error));
  }, 4000);
}

async function tick() {
  const state = await prisma.eventState.findUnique({ where: { id: "event" } });
  if (!state?.simulationEnabled || state.submissionsLocked || state.leaderboardFrozen) return;
  const milestones = await prisma.milestone.findMany({ orderBy: { sortOrder: "asc" } });
  const clock = readClock(state);
  const open = milestones.filter(
    (milestone) => milestoneState(milestone.openOffsetMin, milestone.closeOffsetMin, clock.elapsedMs) === "open",
  );
  const pool = open.length ? open : milestones.filter((milestone) => milestone.closeOffsetMin <= 20 * 60);
  if (!pool.length) return;
  const count = await prisma.team.count();
  if (!count) return;
  const team = await prisma.team.findFirst({
    skip: Math.floor(Math.random() * count),
    include: { submissions: true },
  });
  if (!team) return;
  const milestone = pool[Math.floor(Math.random() * pool.length)];
  const existing = team.submissions.find((item) => item.milestoneId === milestone.id);
  const current = existing?.progress ?? 0;
  if (current >= 100) return;
  const bump = 8 + Math.floor(Math.random() * 18);
  const progress = Math.min(100, current + bump);
  const window = milestoneState(milestone.openOffsetMin, milestone.closeOffsetMin, clock.elapsedMs);
  const isLate = window === "closed";
  const statusText =
    existing?.statusText && existing.statusText.length > 12
      ? existing.statusText
      : NOTES[Math.floor(Math.random() * NOTES.length)];
  const submission = existing
    ? await prisma.submission.update({
        where: { id: existing.id },
        data: { progress, statusText, isLate: existing.isLate || isLate, lastActivityAt: new Date() },
      })
    : await prisma.submission.create({
        data: {
          teamId: team.id,
          milestoneId: milestone.id,
          progress,
          statusText,
          isLate,
          githubUrl: `https://github.com/codebharat/${team.code.toLowerCase()}`,
          lastActivityAt: new Date(),
        },
      });
  await prisma.submissionRevision.create({
    data: {
      submissionId: submission.id,
      progress,
      statusText,
      githubUrl: submission.githubUrl,
      demoUrl: submission.demoUrl,
      videoUrl: submission.videoUrl,
      isLate: submission.isLate,
      actorName: "Demo simulation",
    },
  });
  await requestPublish();
}
