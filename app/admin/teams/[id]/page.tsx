"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { formatBytes, send } from "@/components/client";
import { Badge, Button } from "@/components/ui";
import { CRITERIA, trackById } from "@/lib/tracks";

type Detail = {
  team: {
    id: string;
    code: string;
    name: string;
    track: string;
    college: string;
    members: { name: string; role: string }[];
    isFinalist: boolean;
    username: string;
    password: string;
    submissions: {
      id: string;
      code: string;
      name: string;
      statusText: string;
      progress: number;
      githubUrl: string;
      demoUrl: string;
      videoUrl: string;
      isLate: boolean;
      files: { id: string; name: string; size: number }[];
      history: { id: string; progress: number; statusText: string; actorName: string; at: string; isLate: boolean }[];
    }[];
    scores: {
      id: string;
      judge: string;
      title: string;
      status: string;
      engineering: number;
      impact: number;
      prototype: number;
      vision: number;
      overallComment: string;
    }[];
  };
};

export default function TeamDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const next = await send<Detail>(`/api/admin/teams/${params.id}`, "GET");
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open this squad.");
    }
  }, [params.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <div className="h-40 animate-pulse rounded-xl bg-white/5" />;
  const team = data.team;

  return (
    <div className="space-y-5">
      <Link href="/admin/teams" className="text-sm text-neon">All squads</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker">{team.code} · {trackById(team.track).short}</p>
          <h1 className="font-display text-4xl">{team.name}</h1>
          <p className="text-muted">{team.college}</p>
          <p className="mt-2 text-sm">{team.members.map((member) => `${member.name} (${member.role})`).join(" · ")}</p>
        </div>
        <div className="space-y-2 text-right">
          {team.isFinalist ? <Badge tone="gold">Finalist</Badge> : <Badge>Not a finalist</Badge>}
          <div className="font-mono text-sm">{team.username}<br />{team.password}</div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => void send(`/api/admin/teams/${team.id}`, "PATCH", { isFinalist: !team.isFinalist }).then(load).then(() => toast.success("Finalist flag updated.")).catch((err) => toast.error(err.message))}>
              {team.isFinalist ? "Remove finalist" : "Mark finalist"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void send<{ password: string }>(`/api/admin/teams/${team.id}/password`, "POST").then((result) => { toast.success(`New password ${result.password}`); return load(); }).catch((err) => toast.error(err.message))}>
              Reset password
            </Button>
            <a className="inline-flex h-9 items-center rounded-lg border border-white/10 px-3 text-sm" href={`/api/admin/teams/${team.id}/archive`}>Download ZIP</a>
          </div>
        </div>
      </div>
      <section className="grid gap-3">
        {team.submissions.length === 0 ? <p className="text-muted">No gate updates yet.</p> : null}
        {team.submissions.map((submission) => (
          <article key={submission.id} className="frame p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl">{submission.code} · {submission.name}</h2>
              <span className="font-mono">{submission.progress}% {submission.isLate ? "· late" : ""}</span>
            </div>
            <p className="mt-2 text-sm">{submission.statusText}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-neon">
              {submission.githubUrl ? <a href={submission.githubUrl}>GitHub</a> : null}
              {submission.demoUrl ? <a href={submission.demoUrl}>Demo</a> : null}
              {submission.videoUrl ? <a href={submission.videoUrl}>Video</a> : null}
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {submission.files.map((file) => (
                <li key={file.id}>
                  <a className="text-neon" href={`/api/admin/files/${file.id}`}>{file.name}</a>
                  <span className="text-muted"> · {formatBytes(file.size)}</span>
                </li>
              ))}
            </ul>
            <details className="mt-3 text-sm text-muted">
              <summary>History</summary>
              <ul className="mt-2 space-y-1">
                {submission.history.map((item) => (
                  <li key={item.id}>{new Date(item.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {item.actorName} · {item.progress}% · {item.statusText}</li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </section>
      <section className="frame p-4">
        <h2 className="font-display text-2xl">Jury marks</h2>
        <p className="text-sm text-muted">Raw scores from every assigned judge. Squads only see these after you release notes.</p>
        {team.scores.length === 0 ? <p className="mt-3 text-muted">No marks yet.</p> : null}
        <ul className="mt-3 space-y-3">
          {team.scores.map((score) => (
            <li key={score.id} className="rounded-lg border border-white/10 p-3 text-sm">
              <div className="flex justify-between"><span>{score.judge} · {score.title}</span><Badge tone={score.status === "SUBMITTED" ? "emerald" : "gold"}>{score.status}</Badge></div>
              <p className="mt-2 font-mono text-xs">
                {CRITERIA.map((criterion) => `${criterion.label.split(" ")[0]} ${score[criterion.key]}`).join(" · ")}
              </p>
              {score.overallComment ? <p className="mt-2">{score.overallComment}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
