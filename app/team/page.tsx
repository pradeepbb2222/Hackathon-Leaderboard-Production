"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Countdown, PhaseRail, useNow } from "@/components/brand";
import { formatBytes, send, uploadSquadFile } from "@/components/client";
import { Badge, Button, Input, Label, Textarea } from "@/components/ui";
import { liveElapsed, type ClockDTO } from "@/lib/clock";
import { CRITERIA, trackById } from "@/lib/tracks";

type FileItem = { id: string; name: string; size: number };
type Gate = {
  id: string;
  code: string;
  name: string;
  summary: string;
  maxPoints: number;
  fileRequired: boolean;
  requireGithub: boolean;
  requireDemo: boolean;
  requireVideo: boolean;
  state: "upcoming" | "open" | "closed";
  submission: null | {
    statusText: string;
    progress: number;
    githubUrl: string;
    demoUrl: string;
    videoUrl: string;
    isLate: boolean;
    files: FileItem[];
    history: { id: string; progress: number; statusText: string; actorName: string; at: string; isLate: boolean }[];
  };
};

type Dashboard = {
  team: { code: string; name: string; track: string; college: string; members: { name: string; role: string }[]; isFinalist: boolean };
  rank: null | { place: number; previous: number; of: number; total: number; progress: number; judge: number | null };
  clock: ClockDTO;
  locked: boolean;
  feedbackReleased: boolean;
  milestones: Gate[];
  feedback: {
    judge: string;
    title: string;
    engineering: number;
    impact: number;
    prototype: number;
    vision: number;
    engineeringNote: string;
    impactNote: string;
    prototypeNote: string;
    visionNote: string;
    overallComment: string;
  }[];
  announcements: { id: string; title: string; body: string; createdAt: string }[];
  limits: { fileMb: number; quotaMb: number; usedMb: number };
};

export default function TeamPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      setData(await send<Dashboard>("/api/team/dashboard", "GET"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your squad.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const now = useNow(Boolean(data && !data.clock.paused));
  if (error) {
    return (
      <div className="frame p-6">
        <p>{error}</p>
        <Button className="mt-3" onClick={() => void load()}>Retry</Button>
      </div>
    );
  }
  if (!data) return <div className="h-48 animate-pulse rounded-xl bg-white/5" />;
  const delta = data.rank ? data.rank.previous - data.rank.place : 0;
  const track = trackById(data.team.track);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">{data.team.code} · {track.short}</p>
          <h1 className="font-display text-4xl">{data.team.name}</h1>
          <p className="text-muted">{data.team.college}</p>
          <p className="mt-2 text-sm">{data.team.members.map((member) => member.name).join(" · ")}</p>
          {data.team.isFinalist ? <div className="mt-2"><Badge tone="gold">Grand finalist</Badge></div> : null}
        </div>
        {data.clock.showCountdown ? <Countdown clock={data.clock} /> : null}
      </div>
      <PhaseRail elapsedMs={liveElapsed(data.clock, now)} />
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="frame p-4">
          <div className="kicker">Rank</div>
          <div className="font-display text-4xl">{data.rank ? data.rank.place : "—"}<span className="text-lg text-muted">/{data.rank?.of ?? "—"}</span></div>
          <div className="text-sm">{delta > 0 ? <span className="text-emerald">Up {delta}</span> : delta < 0 ? <span className="text-saffron">Down {Math.abs(delta)}</span> : "Holding"}</div>
        </div>
        <div className="frame p-4">
          <div className="kicker">Progress</div>
          <div className="font-display text-4xl">{data.rank ? data.rank.progress.toFixed(1) : "0"}</div>
        </div>
        <div className="frame p-4">
          <div className="kicker">Jury</div>
          <div className="font-display text-4xl">{data.rank?.judge == null ? "—" : data.rank.judge.toFixed(1)}</div>
          <div className="text-sm text-muted">Total {data.rank ? data.rank.total.toFixed(1) : "—"}</div>
        </div>
      </section>
      {data.locked ? <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm">Ops has locked submissions. You can still read everything here.</p> : null}
      <section className="space-y-3">
        <h2 className="font-display text-2xl">From ops</h2>
        {data.announcements.length === 0 ? <p className="text-muted">No broadcasts yet.</p> : null}
        {data.announcements.map((item) => (
          <article key={item.id} className="frame p-4">
            <h3 className="font-medium">{item.title}</h3>
            <p className="mt-1 text-sm">{item.body}</p>
          </article>
        ))}
      </section>
      <section className="space-y-4">
        {data.milestones.map((gate) => (
          <GateCard key={gate.id} gate={gate} locked={data.locked} limits={data.limits} onSaved={load} />
        ))}
      </section>
      <section className="frame p-4">
        <h2 className="font-display text-2xl">Jury notes</h2>
        {!data.feedbackReleased ? <p className="mt-2 text-sm text-muted">Notes stay sealed until ops releases them.</p> : null}
        {data.feedbackReleased && data.feedback.length === 0 ? <p className="mt-2 text-sm text-muted">No submitted marks yet.</p> : null}
        <ul className="mt-3 space-y-3">
          {data.feedback.map((note) => (
            <li key={note.judge} className="rounded-lg border border-white/10 p-3 text-sm">
              <div className="font-medium">{note.judge}</div>
              <p className="text-xs text-muted">{note.title}</p>
              <ul className="mt-2 space-y-1">
                {CRITERIA.map((criterion) => (
                  <li key={criterion.key}>
                    <span className="text-muted">{criterion.label}:</span> {note[criterion.key]}
                    {note[`${criterion.key}Note` as const] ? <span className="block text-muted">{note[`${criterion.key}Note` as keyof typeof note]}</span> : null}
                  </li>
                ))}
              </ul>
              {note.overallComment ? <p className="mt-2">{note.overallComment}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function GateCard({ gate, locked, limits, onSaved }: { gate: Gate; locked: boolean; limits: Dashboard["limits"]; onSaved: () => Promise<void> }) {
  const sub = gate.submission;
  const [statusText, setStatusText] = useState(sub?.statusText ?? "");
  const [progress, setProgress] = useState(sub?.progress ?? 0);
  const [githubUrl, setGithubUrl] = useState(sub?.githubUrl ?? "");
  const [demoUrl, setDemoUrl] = useState(sub?.demoUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(sub?.videoUrl ?? "");
  const [busy, setBusy] = useState(false);
  const disabled = locked || gate.state === "upcoming";

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await send<{ isLate: boolean }>(`/api/team/milestones/${gate.id}`, "PUT", {
        statusText, progress: Number(progress), githubUrl, demoUrl, videoUrl,
      });
      toast.success(result.isLate ? "Saved and flagged late." : "Update saved.");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setBusy(true);
    try {
      await uploadSquadFile(gate.id, file);
      toast.success("File stored.");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="frame p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="kicker">{gate.code} · {gate.maxPoints} pts</p>
          <h2 className="font-display text-2xl">{gate.name}</h2>
          <p className="mt-1 text-sm text-muted">{gate.summary}</p>
        </div>
        <div className="flex gap-2">
          <Badge tone={gate.state === "open" ? "emerald" : gate.state === "closed" ? "saffron" : "neutral"}>{gate.state}</Badge>
          {sub?.isLate ? <Badge tone="gold">Late</Badge> : null}
        </div>
      </div>
      {gate.state === "upcoming" ? <p className="mt-3 text-sm text-muted">This gate is not open yet.</p> : null}
      {gate.state === "closed" && !locked ? <p className="mt-3 text-sm text-gold">The window has closed. A save now is kept and marked late.</p> : null}
      <form className="mt-4 space-y-3" onSubmit={save}>
        <div>
          <Label htmlFor={`${gate.id}-status`}>Status</Label>
          <Textarea id={`${gate.id}-status`} value={statusText} onChange={(event) => setStatusText(event.target.value)} disabled={disabled} required />
        </div>
        <div>
          <Label htmlFor={`${gate.id}-progress`}>Progress {progress}%</Label>
          <input id={`${gate.id}-progress`} type="range" min={0} max={100} value={progress} disabled={disabled} onChange={(event) => setProgress(Number(event.target.value))} className="w-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label htmlFor={`${gate.id}-gh`}>GitHub {gate.requireGithub ? "(required at 100%)" : ""}</Label><Input id={`${gate.id}-gh`} value={githubUrl} disabled={disabled} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://" /></div>
          <div><Label htmlFor={`${gate.id}-demo`}>Demo {gate.requireDemo ? "(required at 100%)" : ""}</Label><Input id={`${gate.id}-demo`} value={demoUrl} disabled={disabled} onChange={(event) => setDemoUrl(event.target.value)} placeholder="https://" /></div>
          <div><Label htmlFor={`${gate.id}-vid`}>Video {gate.requireVideo ? "(required at 100%)" : ""}</Label><Input id={`${gate.id}-vid`} value={videoUrl} disabled={disabled} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://" /></div>
        </div>
        <div>
          <Label htmlFor={`${gate.id}-file`}>File {gate.fileRequired ? `(required at 100%, up to ${limits.fileMb} MB)` : `(optional, up to ${limits.fileMb} MB)`}</Label>
          <p className="mb-1 text-xs text-muted">Squad storage used: {limits.usedMb} MB of {limits.quotaMb} MB.</p>
          <input id={`${gate.id}-file`} type="file" disabled={disabled || busy} accept=".pdf,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.webp,.gif" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }} />
          <ul className="mt-2 space-y-1 text-sm">
            {sub?.files.map((file) => (
              <li key={file.id}><a className="text-neon" href={`/api/team/files/${file.id}`}>{file.name}</a> <span className="text-muted">{formatBytes(file.size)}</span></li>
            ))}
          </ul>
        </div>
        <Button type="submit" disabled={disabled || busy} className="w-full sm:w-auto">{busy ? "Saving…" : "Save update"}</Button>
      </form>
      {sub?.history.length ? (
        <details className="mt-3 text-sm text-muted">
          <summary>Submission history</summary>
          <ul className="mt-2 space-y-1">
            {sub.history.map((item) => (
              <li key={item.id}>{new Date(item.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {item.progress}% · {item.actorName}{item.isLate ? " · late" : ""} · {item.statusText}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}
