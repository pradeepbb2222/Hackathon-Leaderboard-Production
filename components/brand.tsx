"use client";

import Link from "next/link";
import { formatDuration, liveElapsed, phaseLabel, type ClockDTO } from "@/lib/clock";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

export function Wordmark({
  href = "/",
  compact = false,
  name = "CodeBharat",
  edition = "2026 · 2nd edition",
  logoUrl = "",
}: {
  href?: string;
  compact?: boolean;
  name?: string;
  edition?: string;
  logoUrl?: string;
}) {
  const mark = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "CB";
  return (
    <Link href={href} className="flex items-center gap-3">
      {logoUrl ? (
        // Logo comes from the organizer's EVENT_LOGO_URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
      ) : (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-saffron font-display text-sm font-bold text-[#1a0c04]">
          {mark}
        </span>
      )}
      <span>
        <span className="block font-display text-lg tracking-[0.18em]">{name.toUpperCase()}</span>
        {compact ? null : <span className="kicker">{edition}</span>}
      </span>
    </Link>
  );
}

export function useNow(active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

export function Countdown({ clock, large = false }: { clock: ClockDTO; large?: boolean }) {
  const now = useNow(!clock.paused);
  const elapsed = liveElapsed(clock, now);
  const sprintMs = clock.sprintMinutes * 60 * 1000;
  let label = "Until code freeze";
  let value = sprintMs - elapsed;
  if (elapsed < 0) {
    label = "Until kickoff";
    value = -elapsed;
  } else if (elapsed >= sprintMs) {
    label = "Sprint status";
    value = 0;
  }
  return (
    <div className={cn("text-right", large && "text-left sm:text-right")}>
      <div className="kicker">{clock.paused ? "Clock paused" : label}</div>
      <div className={cn("font-mono tabular-nums text-neon", large ? "text-4xl sm:text-5xl" : "text-2xl")}>
        {elapsed >= sprintMs && elapsed >= 0 ? "FREEZE" : formatDuration(Math.max(0, value))}
      </div>
      <div className="text-xs text-muted">{phaseLabel(elapsed < 0 ? "pre" : elapsed >= sprintMs ? "freeze" : elapsed >= 4 * 60 * 60000 ? "build" : "framing")}</div>
    </div>
  );
}

export function PhaseRail({ elapsedMs }: { elapsedMs: number }) {
  const hours = Math.max(0, elapsedMs / 3600000);
  const pct = Math.max(0, Math.min(100, (hours / 20) * 100));
  const marks = [
    { h: 0, label: "Kickoff" },
    { h: 4, label: "Blueprint" },
    { h: 10, label: "Core" },
    { h: 16, label: "Feature" },
    { h: 20, label: "Freeze" },
  ];
  return (
    <div className="relative pt-6">
      <div className="h-1 rounded-full bg-white/10">
        <div className="h-1 rounded-full bg-gradient-to-r from-saffron via-gold to-emerald" style={{ width: `${pct}%` }} />
      </div>
      <div className="relative mt-2 h-8">
        {marks.map((mark) => (
          <div key={mark.h} className="absolute -translate-x-1/2 text-center" style={{ left: `${(mark.h / 20) * 100}%` }}>
            <div className={cn("mx-auto h-2 w-2 rounded-full", hours >= mark.h ? "bg-emerald" : "bg-white/25")} />
            <div className="mt-1 hidden font-mono text-[10px] uppercase tracking-wider text-muted sm:block">{mark.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiveDot({ on, label = "Live" }: { on: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em]">
      <span className={cn("h-2 w-2 rounded-full", on ? "bg-emerald shadow-[0_0_12px_#1ee0a0]" : "bg-gold")} />
      {on ? label : "Reconnecting"}
    </span>
  );
}
