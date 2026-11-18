import { getBranding } from "@/lib/branding";
import { readClock, milestoneState } from "@/lib/clock";
import { prisma } from "@/lib/prisma";
import { judgeScore, progressScore, round1, totalScore } from "@/lib/scoring";
import type { TrackId } from "@/lib/tracks";
import type { BoardPayload, BoardRow, PublicBoard, TickerItem } from "@/lib/types";

const RANK_WINDOW_MS = 45_000;

let cache: { at: number; data: BoardPayload } | null = null;
let rankWrite: Promise<void> | null = null;

export function invalidateBoard() {
  cache = null;
}

export async function getBoard(force = false): Promise<BoardPayload> {
  if (!force && cache && Date.now() - cache.at < 1500) return cache.data;
  const data = await computeBoard();
  cache = { at: Date.now(), data };
  return data;
}

async function computeBoard(): Promise<BoardPayload> {
  const [state, milestones, teams, memories, recent, announcement] = await Promise.all([
    prisma.eventState.findUniqueOrThrow({ where: { id: "event" } }),
    prisma.milestone.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.team.findMany({
      include: {
        submissions: {
          select: { milestoneId: true, progress: true, isLate: true, lastActivityAt: true },
        },
        scores: {
          select: { status: true, engineering: true, impact: true, prototype: true, vision: true },
        },
      },
    }),
    prisma.rankMemory.findMany(),
    prisma.submission.findMany({
      where: { progress: { gte: 100 } },
      orderBy: { lastActivityAt: "desc" },
      take: 10,
      include: {
        team: { select: { code: true, name: true } },
        milestone: { select: { code: true, name: true } },
      },
    }),
    prisma.announcement.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  if (state.leaderboardFrozen && state.frozenSnapshot) {
    try {
      const frozen = JSON.parse(state.frozenSnapshot) as BoardPayload;
      frozen.hidden = state.leaderboardHidden;
      frozen.frozen = true;
      frozen.locked = state.submissionsLocked;
      frozen.simulation = state.simulationEnabled;
      frozen.branding = getBranding();
      frozen.clock = readClock(state);
      frozen.phase = frozen.clock.phase;
      frozen.generatedAt = Date.now();
      return frozen;
    } catch {
      // Snapshot was unreadable; recompute and replace it below.
    }
  }

  const clock = readClock(state);
  const memory = new Map(memories.map((item) => [item.teamId, item]));
  const rows: BoardRow[] = teams.map((team) => {
    const dots = milestones.map((milestone) => {
      const sub = team.submissions.find((item) => item.milestoneId === milestone.id);
      const progress = sub?.progress ?? 0;
      return {
        id: milestone.id,
        code: milestone.code,
        name: milestone.name,
        progress,
        isLate: Boolean(sub?.isLate),
        completed: progress >= 100,
        state: milestoneState(milestone.openOffsetMin, milestone.closeOffsetMin, clock.elapsedMs),
      };
    });
    const progress = progressScore(
      team.submissions.map((item) => ({ milestoneId: item.milestoneId, progress: item.progress })),
      milestones,
    );
    const judged = judgeScore(team.scores);
    return {
      teamId: team.id,
      rank: 0,
      previousRank: 0,
      code: team.code,
      name: team.name,
      college: team.college,
      track: team.track as TrackId,
      milestones: dots,
      completedCount: dots.filter((dot) => dot.completed).length,
      progressScore: round1(progress),
      judgeScore: judged == null ? null : round1(judged),
      total: round1(totalScore(progress, judged, state.progressWeight, state.judgeWeight)),
      isFinalist: team.isFinalist,
    };
  });

  rows.sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
  rows.forEach((row, index) => {
    row.rank = index + 1;
    row.previousRank = memory.get(row.teamId)?.previousRank ?? row.rank;
  });

  const sample = memories[0];
  const stale = !sample || Date.now() - sample.updatedAt.getTime() > RANK_WINDOW_MS;
  if (stale && rows.length && !rankWrite) {
    const snapshot = rows.map((row) => {
      const stored = memory.get(row.teamId);
      const published = stored && stored.publishedRank > 0 ? stored.publishedRank : row.rank;
      const previous = stored?.previousRank ?? row.rank;
      return {
        teamId: row.teamId,
        publishedRank: row.rank,
        previousRank: published !== row.rank ? published : previous,
      };
    });
    rankWrite = prisma
      .$transaction(
        snapshot.map((row) =>
          prisma.rankMemory.upsert({
            where: { teamId: row.teamId },
            create: {
              teamId: row.teamId,
              previousRank: row.previousRank,
              publishedRank: row.publishedRank,
            },
            update: {
              previousRank: row.previousRank,
              publishedRank: row.publishedRank,
              updatedAt: new Date(),
            },
          }),
        ),
      )
      .then(() => undefined)
      .finally(() => {
        rankWrite = null;
      });
  }

  const ticker: TickerItem[] = recent.map((item) => ({
    id: item.id,
    kind: "milestone",
    text: `${item.team.code} ${item.team.name} completed ${item.milestone.code} ${item.milestone.name}`,
    at: item.lastActivityAt.getTime(),
  }));
  if (announcement) {
    ticker.unshift({
      id: announcement.id,
      kind: "broadcast",
      text: `${announcement.title} — ${announcement.body}`,
      at: announcement.createdAt.getTime(),
    });
  }

  return {
    clock,
    phase: clock.phase,
    hidden: state.leaderboardHidden,
    frozen: state.leaderboardFrozen,
    locked: state.submissionsLocked,
    simulation: state.simulationEnabled,
    weights: { progress: state.progressWeight, judge: state.judgeWeight },
    branding: getBranding(),
    rows,
    ticker: ticker.slice(0, 12),
    generatedAt: Date.now(),
  };
}

export function toPublicBoard(board: BoardPayload): PublicBoard {
  return {
    ...board,
    rows: board.rows.map((row) => {
      const { teamId, ...rest } = row;
      void teamId;
      if (!board.hidden) return { ...rest, sealed: false };
      return {
        ...rest,
        judgeScore: null,
        total: 0,
        previousRank: rest.rank,
        sealed: true,
      };
    }),
  };
}

export async function freezeCurrentBoard() {
  const board = await computeBoard();
  board.frozen = true;
  await prisma.eventState.update({
    where: { id: "event" },
    data: { leaderboardFrozen: true, frozenSnapshot: JSON.stringify(board) },
  });
  invalidateBoard();
  return board;
}
