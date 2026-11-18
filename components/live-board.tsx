"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Countdown, LiveDot, PhaseRail, useNow, Wordmark } from "@/components/brand";
import { liveElapsed } from "@/lib/clock";
import { cn } from "@/lib/cn";
import { TRACKS, trackById } from "@/lib/tracks";
import type { MilestoneDot, PublicBoard } from "@/lib/types";

const TRACK_TONE: Record<string, string> = {
  LEARNING: "text-saffron border-saffron/40",
  REGENERAX: "text-emerald border-emerald/40",
  INSIGHT: "text-neon border-neon/40",
  FARMING: "text-gold border-gold/40",
  SOCIETAL: "text-[#d2b4ff] border-[#d2b4ff]/40",
};

export function LiveBoard({ mode }: { mode: "floor" | "tv" }) {
  const [board, setBoard] = useState<PublicBoard | null>(null);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const [track, setTrack] = useState("ALL");
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("still")) setPaused(true);
  }, []);
  const scroller = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, number>());
  const hover = useRef(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let source: EventSource | null = null;
    let poll = 0;
    const apply = (data: PublicBoard) => {
      if (!data?.rows) return;
      setBoard(data);
      setError("");
    };
    const pull = () => {
      fetch("/api/live/board", { cache: "no-store" })
        .then((res) => res.json())
        .then(apply)
        .catch(() => setError("The live board could not be reached."));
    };
    pull();
    source = new EventSource("/api/live/stream");
    source.onopen = () => setLive(true);
    source.onmessage = (event) => {
      try {
        apply(JSON.parse(event.data) as PublicBoard);
        setLive(true);
      } catch {
        /* ignore keepalives that are not data */
      }
    };
    source.onerror = () => {
      setLive(false);
      if (!poll) poll = window.setInterval(pull, 4000);
    };
    return () => {
      source?.close();
      if (poll) window.clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (mode !== "tv") return;
    const order = ["ALL", ...TRACKS.map((item) => item.id)];
    const id = window.setInterval(() => {
      setTrack((current) => order[(order.indexOf(current) + 1) % order.length]);
    }, 18000);
    return () => window.clearInterval(id);
  }, [mode]);

  const rows = useMemo(() => {
    if (!board) return [];
    if (track === "ALL") return board.rows;
    return board.rows.filter((row) => row.track === track);
  }, [board, track]);

  useLayoutEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>("[data-row]");
    nodes.forEach((node) => {
      const id = node.dataset.row || "";
      const top = node.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
      const prev = positions.current.get(id);
      if (prev != null && Math.abs(prev - top) > 4 && !reduced.current) {
        node.animate(
          [{ transform: `translateY(${prev - top}px)` }, { transform: "translateY(0)" }],
          { duration: 700, easing: "cubic-bezier(.16,1,.3,1)" },
        );
        node.classList.remove("rank-up", "rank-down");
        node.classList.add(prev > top ? "rank-up" : "rank-down");
        window.setTimeout(() => node.classList.remove("rank-up", "rank-down"), 1100);
      }
      positions.current.set(id, top);
    });
  }, [rows]);

  useEffect(() => {
    positions.current.clear();
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [track]);

  useEffect(() => {
    if (reduced.current || paused) return;
    let frame = 0;
    let last = performance.now();
    const step = (time: number) => {
      const el = scroller.current;
      if (el && !hover.current) {
        el.scrollTop += (time - last) * (mode === "tv" ? 0.05 : 0.03);
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) el.scrollTop = 0;
      }
      last = time;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [mode, paused, track]);

  const now = useNow(Boolean(board && !board.clock.paused));
  const elapsed = board ? liveElapsed(board.clock, now) : 0;
  const activeTrack = TRACKS.find((item) => item.id === track);

  return (
    <div className={cn("flex h-dvh flex-col", mode === "tv" && "bg-black/40")}>
      <header className="shrink-0 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Wordmark
              name={board?.branding.name ?? "CodeBharat"}
              edition={board?.branding.edition ?? "2026 · 2nd edition"}
              logoUrl={board?.branding.logoUrl}
            />
            <p className="mt-2 max-w-xl text-sm text-muted">
              {board?.branding.venue ?? "IIIT Dharwad"} · {board?.branding.dates ?? "3–4 December 2026"} · {board?.branding.theme ?? "From Code to Concrete Innovation"}
            </p>
          </div>
          <div className="flex items-start gap-6">
            <LiveDot on={live} label={board?.frozen ? "Frozen" : "Live"} />
            {board && board.clock.showCountdown ? <Countdown clock={board.clock} large={mode === "tv"} /> : null}
          </div>
        </div>
        {board ? <PhaseRail elapsedMs={elapsed} /> : <div className="h-8" />}
        <div className="mt-2 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter by track">
          <TrackTab active={track === "ALL"} onClick={() => setTrack("ALL")}>All tracks</TrackTab>
          {TRACKS.map((item) => (
            <TrackTab key={item.id} active={track === item.id} onClick={() => setTrack(item.id)}>
              {item.short}
            </TrackTab>
          ))}
          <span className="ml-auto flex gap-2">
            {mode === "floor" ? (
              <button className="rounded-full border border-white/15 px-3 py-1 text-xs text-muted" onClick={() => setPaused((value) => !value)}>
                {paused ? "Resume scroll" : "Pause scroll"}
              </button>
            ) : null}
            {mode === "floor" ? (
              <Link href="/tv" className="rounded-full border border-white/15 px-3 py-1 text-xs text-neon">
                TV mode
              </Link>
            ) : (
              <button className="rounded-full border border-white/15 px-3 py-1 text-xs text-neon" onClick={() => document.documentElement.requestFullscreen?.()}>
                Full screen
              </button>
            )}
            {mode === "floor" ? (
              <Link href="/login" className="rounded-full border border-white/15 px-3 py-1 text-xs text-muted">
                Staff login
              </Link>
            ) : null}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted">
          {activeTrack ? `${activeTrack.name} — ${activeTrack.line}` : "All five tracks on one table."}{" "}
          <span className="font-mono text-xs">{rows.length} squads</span>
          {board?.hidden ? <span className="ml-2 text-gold">Scores sealed</span> : null}
          {board?.frozen ? <span className="ml-2 text-neon">Order frozen</span> : null}
        </p>
      </header>
      <Ticker items={board?.ticker ?? []} />
      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-auto px-2 sm:px-4"
        onMouseEnter={() => {
          if (mode === "floor") hover.current = true;
        }}
        onMouseLeave={() => {
          hover.current = false;
        }}
      >
        {error ? (
          <div className="frame m-4 p-6">
            <p>{error}</p>
            <button className="mt-3 text-sm text-neon" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        ) : null}
        {!board && !error ? <BoardSkeleton /> : null}
        {board && rows.length === 0 ? <p className="p-6 text-muted">No squads on this track yet.</p> : null}
        {rows.length ? (
          <table className={cn("w-full min-w-[760px] border-separate border-spacing-y-1 text-left", mode === "tv" && "min-w-[980px] text-lg")}>
            <caption className="sr-only">CodeBharat 2026 squad leaderboard</caption>
            <thead className="sticky top-0 z-10 bg-[#07080c]/90 text-xs uppercase tracking-[0.14em] text-muted backdrop-blur">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Move</th>
                <th className="px-3 py-2 font-medium">Squad</th>
                <th className="px-3 py-2 font-medium">Track</th>
                <th className="px-3 py-2 font-medium">Gates</th>
                <th className="px-3 py-2 text-right font-medium">Progress</th>
                <th className="px-3 py-2 text-right font-medium">Jury</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const delta = row.previousRank - row.rank;
                const podium = row.rank === 1 ? "podium-1" : row.rank === 2 ? "podium-2" : row.rank === 3 ? "podium-3" : "";
                return (
                  <tr key={row.code} data-row={row.code} className={cn("text-sm sm:text-base", mode === "tv" && "text-xl", podium || "bg-white/[0.035]")}>
                    <td className="rounded-l-lg px-3 py-3 font-display text-xl tabular-nums">{row.rank}</td>
                    <td className="px-3 py-3 font-mono text-sm">
                      {board?.hidden ? "·" : delta > 0 ? <span className="text-emerald">▲{delta}</span> : delta < 0 ? <span className="text-saffron">▼{Math.abs(delta)}</span> : <span className="text-white/30">·</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">
                        {row.name}{" "}
                        {row.isFinalist ? <span className="ml-1 align-middle text-[10px] uppercase tracking-wider text-gold">Finalist</span> : null}
                      </div>
                      <div className="text-xs text-muted">
                        <span className="font-mono">{row.code}</span> · {row.college}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs", TRACK_TONE[row.track])}>{trackById(row.track).short}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Dots dots={row.milestones} />
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">{row.progressScore.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">{row.sealed ? "—" : row.judgeScore == null ? "—" : row.judgeScore.toFixed(1)}</td>
                    <td className="rounded-r-lg px-3 py-3 text-right font-mono text-base tabular-nums text-ink">
                      {row.sealed ? <span className="text-gold">SEALED</span> : row.total.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </div>
      <footer className="shrink-0 border-t border-white/10 px-4 py-2 text-center text-[11px] uppercase tracking-[0.16em] text-muted">
        Presented by Savishkar India · Technical partner SASA Engineers · {board ? `${board.branding.venue} · Progress ${board.weights.progress} / Jury ${board.weights.judge}` : "IIIT Dharwad"}
      </footer>
    </div>
  );
}

function TrackTab({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn("rounded-full px-3 py-1 text-sm", active ? "bg-white text-[#14110d]" : "border border-white/10 text-muted hover:text-ink")}
    >
      {children}
    </button>
  );
}

function Dots({ dots }: { dots: MilestoneDot[] }) {
  return (
    <div className="flex gap-1.5" aria-label="Milestone gates">
      {dots.map((dot) => {
        const color = dot.completed && dot.isLate ? "#ffb020" : dot.completed ? "#1ee0a0" : "#3ee7ff";
        return (
          <span
            key={dot.id}
            title={`${dot.code} ${dot.name}: ${dot.progress}%${dot.isLate ? " late" : ""}`}
            className="grid h-3.5 w-3.5 place-items-center rounded-full"
            style={{ background: `conic-gradient(${color} ${dot.progress}%, rgba(255,255,255,0.16) 0)` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#07080c]" />
          </span>
        );
      })}
    </div>
  );
}

function Ticker({ items }: { items: PublicBoard["ticker"] }) {
  if (!items.length) {
    return <div className="border-y border-white/10 px-4 py-2 text-sm text-muted">Waiting for the first gate completion.</div>;
  }
  const line = [...items, ...items];
  return (
    <div className="ticker overflow-hidden border-y border-white/10 py-2" aria-live="polite">
      <div className="ticker-track gap-8 px-4">
        {line.map((item, index) => (
          <span key={`${item.id}-${index}`} className="font-mono text-xs text-muted sm:text-sm">
            <span className={item.kind === "broadcast" ? "text-saffron" : "text-emerald"}>{item.kind === "broadcast" ? "OPS" : "GATE"}</span>{" "}
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-lg bg-white/5" />
      ))}
    </div>
  );
}
