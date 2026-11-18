"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { send } from "@/components/client";
import { Badge, Button, Input } from "@/components/ui";
import { trackById } from "@/lib/tracks";

type Row = {
  id: string;
  code: string;
  name: string;
  track: string;
  college: string;
  scoreStatus: "NONE" | "DRAFT" | "SUBMITTED";
  completedCount: number;
  members: { name: string }[];
};

export default function JudgeHome() {
  const [teams, setTeams] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ALL");

  async function load() {
    try {
      const data = await send<{ teams: Row[] }>("/api/judge/teams", "GET");
      setTeams(data.teams);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your squads.");
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const shown = useMemo(() => teams.filter((team) => {
    const blob = `${team.code} ${team.name} ${team.college}`.toLowerCase();
    const statusOk = filter === "ALL" || team.scoreStatus === filter;
    return statusOk && blob.includes(q.toLowerCase());
  }), [teams, q, filter]);

  const scored = teams.filter((team) => team.scoreStatus === "SUBMITTED").length;

  return (
    <div className="space-y-4">
      <div>
        <p className="kicker">Your packet</p>
        <h1 className="font-display text-4xl">{scored}/{teams.length || "—"} scored</h1>
        <p className="text-muted">You only see squads assigned to you. Other jurors&apos; marks stay hidden.</p>
      </div>
      {error ? (
        <div className="frame p-4">
          <p>{error}</p>
          <Button className="mt-3" onClick={() => void load()}>Retry</Button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search your squads" aria-label="Search squads" className="max-w-xs" />
        {["ALL", "NONE", "DRAFT", "SUBMITTED"].map((item) => (
          <button key={item} className={`rounded-full px-3 py-1 text-sm ${filter === item ? "bg-white text-black" : "border border-white/10 text-muted"}`} onClick={() => setFilter(item)}>
            {item === "NONE" ? "Not scored" : item === "ALL" ? "All" : item[0] + item.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {!ready && !error ? <div className="h-24 animate-pulse rounded-xl bg-white/5" /> : null}
      <ul className="space-y-2">
        {shown.map((team) => (
          <li key={team.id}>
            <Link href={`/judge/${team.id}`} className="frame flex items-center justify-between gap-3 p-4">
              <span>
                <span className="font-mono text-xs text-muted">{team.code}</span>
                <span className="block font-medium">{team.name}</span>
                <span className="text-sm text-muted">{team.college} · {trackById(team.track).short} · {team.completedCount}/5 gates</span>
              </span>
              <Badge tone={team.scoreStatus === "SUBMITTED" ? "emerald" : team.scoreStatus === "DRAFT" ? "gold" : "neutral"}>
                {team.scoreStatus === "NONE" ? "Not scored" : team.scoreStatus === "DRAFT" ? "Draft" : "Submitted"}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
      {teams.length && !shown.length ? <p className="text-muted">Nothing in this filter.</p> : null}
      {ready && !teams.length && !error ? <p className="text-muted">Ops has not assigned squads to you yet.</p> : null}
    </div>
  );
}
