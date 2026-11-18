import { SPRINT_MINUTES } from "@/lib/tracks";

export type Phase = "pre" | "framing" | "build" | "freeze";

export type ClockDTO = {
  serverNow: number;
  elapsedMs: number;
  paused: boolean;
  showCountdown: boolean;
  sprintMinutes: number;
  startsAt: number;
  phase: Phase;
};

export function phaseFromElapsed(elapsedMs: number): Phase {
  if (elapsedMs < 0) return "pre";
  const min = elapsedMs / 60000;
  if (min >= SPRINT_MINUTES) return "freeze";
  if (min >= 4 * 60) return "build";
  return "framing";
}

export function phaseLabel(phase: Phase) {
  if (phase === "pre") return "Before kickoff";
  if (phase === "framing") return "Phase 01 · Architecture";
  if (phase === "build") return "Phase 02 · Development";
  return "Code freeze";
}

type ClockState = {
  startsAt: Date;
  paused: boolean;
  pausedAt: Date | null;
  accumulatedPauseMs: number;
  showCountdown: boolean;
};

export function readClock(state: ClockState, now = Date.now()): ClockDTO {
  const anchor = state.paused && state.pausedAt ? state.pausedAt.getTime() : now;
  const elapsedMs = anchor - state.startsAt.getTime() - state.accumulatedPauseMs;
  return {
    serverNow: now,
    elapsedMs,
    paused: state.paused,
    showCountdown: state.showCountdown,
    sprintMinutes: SPRINT_MINUTES,
    startsAt: state.startsAt.getTime(),
    phase: phaseFromElapsed(elapsedMs),
  };
}

export function liveElapsed(clock: ClockDTO, now = Date.now()) {
  if (clock.paused) return clock.elapsedMs;
  return clock.elapsedMs + (now - clock.serverNow);
}

export function milestoneState(openOffsetMin: number, closeOffsetMin: number, elapsedMs: number) {
  if (elapsedMs < 0) return "upcoming" as const;
  const min = elapsedMs / 60000;
  if (min < openOffsetMin) return "upcoming" as const;
  if (min >= closeOffsetMin) return "closed" as const;
  return "open" as const;
}

export function formatDuration(ms: number) {
  const sign = ms < 0 ? -1 : 1;
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const body = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return sign < 0 ? `−${body}` : body;
}

export function formatIST(epochMs: number) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(epochMs));
}
