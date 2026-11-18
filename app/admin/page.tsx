"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Countdown, PhaseRail, useNow } from "@/components/brand";
import { send } from "@/components/client";
import { Badge, Button, Input, Label, Switch } from "@/components/ui";
import { liveElapsed } from "@/lib/clock";
import type { ClockDTO } from "@/lib/clock";

type Overview = {
  teams: number;
  judges: number;
  submissions: number;
  files: number;
  finalists: number;
  byTrack: { id: string; short: string; count: number }[];
  completion: { code: string; name: string; completed: number }[];
  audits: { id: string; actorName: string; action: string; createdAt: string }[];
  leaders: { rank: number; code: string; name: string; college: string; total: number }[];
  clock: ClockDTO;
  event: {
    startsAt: string;
    paused: boolean;
    showCountdown: boolean;
    submissionsLocked: boolean;
    leaderboardHidden: boolean;
    leaderboardFrozen: boolean;
    feedbackReleased: boolean;
    progressWeight: number;
    judgeWeight: number;
    simulationEnabled: boolean;
  };
};

export default function AdminHome() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [weights, setWeights] = useState({ progress: 40, judge: 60 });
  const [kickoff, setKickoff] = useState("");

  async function load() {
    try {
      const next = await send<Overview>("/api/admin/overview", "GET");
      setData(next);
      setWeights({ progress: next.event.progressWeight, judge: next.event.judgeWeight });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ops.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    const id = window.setInterval(() => void load(), 8000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(id);
    };
  }, []);

  async function patch(body: Record<string, unknown>, message: string) {
    try {
      await send("/api/admin/event", "PATCH", body);
      toast.success(message);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    }
  }

  const now = useNow(Boolean(data && !data.event.paused));
  const elapsed = data ? liveElapsed(data.clock, now) : 0;

  if (error) {
    return (
      <div className="frame p-6">
        <p>{error}</p>
        <Button className="mt-3" onClick={() => void load()}>Retry</Button>
      </div>
    );
  }
  if (!data) return <div className="h-40 animate-pulse rounded-xl bg-white/5" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Control room</p>
          <h1 className="font-display text-4xl">Floor is {data.event.paused ? "paused" : "running"}</h1>
          <p className="mt-1 text-muted">IIIT Dharwad · Top 25 go to the grand stage at hour 20.</p>
        </div>
        <Countdown clock={data.clock} large />
      </div>
      <PhaseRail elapsedMs={elapsed} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Squads" value={String(data.teams)} />
        <Stat label="Jury" value={String(data.judges)} />
        <Stat label="Updates" value={String(data.submissions)} />
        <Stat label="Files" value={String(data.files)} />
        <Stat label="Finalists" value={`${data.finalists}/25`} />
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="frame space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Sprint clock</h2>
            <Badge tone={data.event.simulationEnabled ? "gold" : "neutral"}>{data.event.simulationEnabled ? "Rehearsal simulation ON" : "Simulation off"}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => void patch({ preset: "hour2" }, "Clock jumped to hour 2.")}>Hour 2 · Framing</Button>
            <Button size="sm" variant="ghost" onClick={() => void patch({ preset: "hour6" }, "Clock jumped to the build.")}>Hour 6 · Build</Button>
            <Button size="sm" variant="ghost" onClick={() => void patch({ preset: "hour19" }, "Final hour.")}>Hour 19 · Final hour</Button>
            <Button size="sm" variant="ghost" onClick={() => void patch({ preset: "hour20" }, "Code freeze.")}>Hour 20 · Freeze</Button>
            <Button size="sm" variant={data.event.paused ? "emerald" : "ghost"} onClick={() => void patch({ paused: !data.event.paused }, data.event.paused ? "Clock resumed." : "Clock paused.")}>
              {data.event.paused ? "Resume" : "Pause"}
            </Button>
          </div>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!kickoff) return;
              void patch({ startsAt: new Date(kickoff).toISOString() }, "Kickoff time updated.");
            }}
          >
            <div>
              <Label htmlFor="kickoff">Set kickoff</Label>
              <Input id="kickoff" type="datetime-local" value={kickoff} onChange={(event) => setKickoff(event.target.value)} />
            </div>
            <Button type="submit" variant="ghost">Apply</Button>
          </form>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="Show countdown" checked={data.event.showCountdown} onChange={(checked) => void patch({ showCountdown: checked }, "Countdown updated.")} />
            <Toggle label="Lock submissions" checked={data.event.submissionsLocked} onChange={(checked) => void patch({ submissionsLocked: checked }, checked ? "Submissions locked." : "Submissions open.")} />
            <Toggle label="Freeze leaderboard" checked={data.event.leaderboardFrozen} onChange={(checked) => void patch({ leaderboardFrozen: checked }, checked ? "Board frozen." : "Board live again.")} />
            <Toggle label="Hide scores" checked={data.event.leaderboardHidden} onChange={(checked) => void patch({ leaderboardHidden: checked }, checked ? "Scores sealed." : "Scores visible.")} />
            <Toggle label="Release jury notes" checked={data.event.feedbackReleased} onChange={(checked) => void patch({ feedbackReleased: checked }, checked ? "Squads can read jury notes." : "Jury notes hidden.")} />
            <Toggle label="Demo simulation (rehearsal only)" checked={data.event.simulationEnabled} onChange={(checked) => void patch({ simulationEnabled: checked }, checked ? "Rehearsal simulation is on." : "Simulation stopped.")} />
          </div>
          <p className="text-sm text-muted">Demo simulation is for rehearsal only. Leave it off on event day. While it is on, open gates move by themselves every few seconds so a projector can show the board. It pauses if the board is frozen or submissions are locked.</p>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void patch({ progressWeight: weights.progress, judgeWeight: weights.judge }, "Scoring weights saved.");
            }}
          >
            <div>
              <Label htmlFor="pw">Progress weight</Label>
              <Input id="pw" type="number" min={0} max={100} value={weights.progress} onChange={(event) => setWeights((value) => ({ ...value, progress: Number(event.target.value) }))} className="w-28" />
            </div>
            <div>
              <Label htmlFor="jw">Jury weight</Label>
              <Input id="jw" type="number" min={0} max={100} value={weights.judge} onChange={(event) => setWeights((value) => ({ ...value, judge: Number(event.target.value) }))} className="w-28" />
            </div>
            <Button type="submit" variant="ghost">Save weights</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void send("/api/admin/finalists", "POST", { mode: "top25" }).then(() => { toast.success("Top 25 marked as finalists."); return load(); }).catch((err) => toast.error(err.message))}>
              Select top 25
            </Button>
            <Button variant="ghost" onClick={() => void send("/api/admin/finalists", "POST", { mode: "clear" }).then(() => { toast.success("Finalists cleared."); return load(); }).catch((err) => toast.error(err.message))}>
              Clear finalists
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="frame p-5">
            <h2 className="font-display text-2xl">Tracks</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {data.byTrack.map((track) => (
                <li key={track.id} className="flex justify-between"><span>{track.short}</span><span className="font-mono">{track.count}</span></li>
              ))}
            </ul>
          </div>
          <div className="frame p-5">
            <h2 className="font-display text-2xl">Gates cleared</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {data.completion.map((gate) => (
                <li key={gate.code} className="flex justify-between gap-3"><span>{gate.code} {gate.name}</span><span className="font-mono">{gate.completed}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="frame p-5">
          <h2 className="font-display text-2xl">Current top</h2>
          <ol className="mt-3 space-y-2">
            {data.leaders.map((row) => (
              <li key={row.code} className="flex items-center justify-between gap-3 text-sm">
                <span><span className="font-mono text-muted">{row.rank}</span> {row.name}</span>
                <span className="font-mono">{row.total.toFixed(1)}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="frame p-5">
          <h2 className="font-display text-2xl">Recent audit</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.audits.map((log) => (
              <li key={log.id} className="flex justify-between gap-3">
                <span>{log.actorName} · {log.action}</span>
                <span className="shrink-0 text-muted">{new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="frame p-4">
      <div className="kicker">{label}</div>
      <div className="mt-1 font-display text-3xl">{value}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}
