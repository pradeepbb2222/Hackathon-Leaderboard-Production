import type { Branding } from "@/lib/branding";
import type { TrackId } from "@/lib/tracks";
import type { ClockDTO, Phase } from "@/lib/clock";

export type MilestoneDot = {
  id: string;
  code: string;
  name: string;
  progress: number;
  isLate: boolean;
  completed: boolean;
  state: "upcoming" | "open" | "closed";
};

export type BoardRow = {
  teamId: string;
  rank: number;
  previousRank: number;
  code: string;
  name: string;
  college: string;
  track: TrackId;
  milestones: MilestoneDot[];
  completedCount: number;
  progressScore: number;
  judgeScore: number | null;
  total: number;
  isFinalist: boolean;
};

export type TickerItem = {
  id: string;
  kind: "milestone" | "broadcast";
  text: string;
  at: number;
};

export type BoardPayload = {
  clock: ClockDTO;
  phase: Phase;
  hidden: boolean;
  frozen: boolean;
  locked: boolean;
  simulation: boolean;
  weights: { progress: number; judge: number };
  branding: Branding;
  rows: BoardRow[];
  ticker: TickerItem[];
  generatedAt: number;
};

export type PublicBoard = Omit<BoardPayload, "rows"> & {
  rows: Array<Omit<BoardRow, "teamId"> & { sealed: boolean }>;
};
