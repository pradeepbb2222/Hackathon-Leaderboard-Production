"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { formatBytes, send } from "@/components/client";
import { Badge, Button, Textarea } from "@/components/ui";
import { CRITERIA, trackById, type CriterionKey } from "@/lib/tracks";

type Score = {
  engineering: number;
  impact: number;
  prototype: number;
  vision: number;
  engineeringNote: string;
  impactNote: string;
  prototypeNote: string;
  visionNote: string;
  overallComment: string;
  status: "DRAFT" | "SUBMITTED";
};

type Payload = {
  team: { code: string; name: string; track: string; college: string; members: { name: string; role: string }[]; isFinalist: boolean };
  locked: boolean;
  milestones: {
    id: string;
    code: string;
    name: string;
    summary: string;
    state: string;
    submission: null | {
      statusText: string;
      progress: number;
      githubUrl: string;
      demoUrl: string;
      videoUrl: string;
      isLate: boolean;
      files: { id: string; name: string; size: number }[];
    };
  }[];
  score: Score | null;
};

const EMPTY: Score = {
  engineering: 0, impact: 0, prototype: 0, vision: 0,
  engineeringNote: "", impactNote: "", prototypeNote: "", visionNote: "", overallComment: "", status: "DRAFT",
};

export default function ScorePage() {
  const params = useParams<{ teamId: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [score, setScore] = useState<Score>(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void send<Payload>(`/api/judge/teams/${params.teamId}`, "GET")
        .then((next) => {
          setData(next);
          if (next.score) setScore(next.score);
        })
        .catch((err) => setError(err.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params.teamId]);

  async function save(submit: boolean) {
    setBusy(true);
    try {
      await send(`/api/judge/teams/${params.teamId}/score`, "PUT", { ...score, submit });
      toast.success(submit ? "Score submitted." : "Draft saved.");
      const next = await send<Payload>(`/api/judge/teams/${params.teamId}`, "GET");
      setData(next);
      if (next.score) setScore(next.score);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <div className="h-40 animate-pulse rounded-xl bg-white/5" />;

  return (
    <div className="space-y-4">
      <Link href="/judge" className="text-sm text-neon">Your squads</Link>
      <div>
        <p className="kicker">{data.team.code} · {trackById(data.team.track).name}</p>
        <h1 className="font-display text-4xl">{data.team.name}</h1>
        <p className="text-muted">{data.team.college} · {data.team.members.map((member) => member.name).join(", ")}</p>
        {data.score ? <div className="mt-2"><Badge tone={data.score.status === "SUBMITTED" ? "emerald" : "gold"}>{data.score.status === "SUBMITTED" ? "Submitted" : "Draft"}</Badge></div> : <div className="mt-2"><Badge>Not scored</Badge></div>}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-3">
          {data.milestones.map((gate) => (
            <article key={gate.id} className="frame p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl">{gate.code} {gate.name}</h2>
                <span className="font-mono text-sm">{gate.submission ? `${gate.submission.progress}%` : "—"}</span>
              </div>
              <p className="text-sm text-muted">{gate.summary}</p>
              {gate.submission ? (
                <>
                  <p className="mt-2 text-sm">{gate.submission.statusText}</p>
                  {gate.submission.isLate ? <p className="text-xs text-gold">Flagged late</p> : null}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-neon">
                    {gate.submission.githubUrl ? <a href={gate.submission.githubUrl}>GitHub</a> : null}
                    {gate.submission.demoUrl ? <a href={gate.submission.demoUrl}>Demo</a> : null}
                    {gate.submission.videoUrl ? <a href={gate.submission.videoUrl}>Video</a> : null}
                  </div>
                  <ul className="mt-2 text-sm">
                    {gate.submission.files.map((file) => (
                      <li key={file.id}><a className="text-neon" href={`/api/judge/files/${file.id}`}>{file.name}</a> <span className="text-muted">{formatBytes(file.size)}</span></li>
                    ))}
                  </ul>
                </>
              ) : <p className="mt-2 text-sm text-muted">No update on this gate.</p>}
            </article>
          ))}
        </section>
        <section className="frame h-fit p-4 lg:sticky lg:top-4">
          <h2 className="font-display text-2xl">Your marks</h2>
          <p className="text-sm text-muted">0 to 10 on each criterion. Drafts do not move the board.</p>
          <div className="mt-4 space-y-4">
            {CRITERIA.map((criterion) => (
              <div key={criterion.key}>
                <div className="flex items-center justify-between text-sm">
                  <span>{criterion.label}</span>
                  <span className="font-mono">{score[criterion.key]}</span>
                </div>
                <p className="text-xs text-muted">{criterion.hint}</p>
                <div className="mt-2 grid grid-cols-11 gap-1">
                  {Array.from({ length: 11 }, (_, value) => (
                    <button
                      key={value}
                      type="button"
                      className={`h-10 rounded-md text-sm ${score[criterion.key] === value ? "bg-saffron text-[#1a0c04]" : "bg-white/10"}`}
                      onClick={() => setScore((current) => ({ ...current, [criterion.key]: value }))}
                      aria-label={`${criterion.label} ${value}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <Textarea
                  className="mt-2 min-h-16"
                  placeholder="Comment"
                  value={score[`${criterion.key}Note` as `${CriterionKey}Note`]}
                  onChange={(event) => setScore((current) => ({ ...current, [`${criterion.key}Note`]: event.target.value }))}
                />
              </div>
            ))}
            <div>
              <p className="mb-1 text-sm text-muted">Overall</p>
              <Textarea value={score.overallComment} onChange={(event) => setScore((current) => ({ ...current, overallComment: event.target.value }))} />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="ghost" disabled={busy || data.locked} onClick={() => void save(false)}>Save draft</Button>
            <Button disabled={busy || data.locked} onClick={() => void save(true)}>Submit score</Button>
          </div>
          {data.locked ? <p className="mt-2 text-sm text-gold">Scoring is locked.</p> : null}
        </section>
      </div>
    </div>
  );
}
