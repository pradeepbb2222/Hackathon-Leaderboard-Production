"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { copyText, send } from "@/components/client";
import { Badge, Button, Dialog, Input, Label, Textarea } from "@/components/ui";
import { TRACKS, trackById } from "@/lib/tracks";

type TeamRow = {
  id: string;
  code: string;
  name: string;
  track: string;
  college: string;
  members: { name: string; role: string }[];
  isFinalist: boolean;
  username: string;
  password: string;
  rank: number | null;
  total: number | null;
  completedCount: number;
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [track, setTrack] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);
  const [form, setForm] = useState({ name: "", track: "REGENERAX", college: "", members: "", password: "" });

  async function load() {
    try {
      const data = await send<{ teams: TeamRow[] }>("/api/admin/teams", "GET");
      setTeams(data.teams);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load squads.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const shown = useMemo(() => {
    return teams.filter((team) => {
      const blob = `${team.code} ${team.name} ${team.college}`.toLowerCase();
      return (track === "ALL" || team.track === track) && blob.includes(q.toLowerCase());
    });
  }, [teams, q, track]);

  async function createTeam(event: React.FormEvent) {
    event.preventDefault();
    try {
      const created = await send<{ username: string; password: string }>("/api/admin/teams", "POST", form);
      setIssued(created);
      setOpen(false);
      setForm({ name: "", track: "REGENERAX", college: "", members: "", password: "" });
      toast.success(`${created.username} is on the floor.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the squad.");
    }
  }

  async function onImport(file: File) {
    const body = new FormData();
    body.set("file", file);
    try {
      const result = await send<{ created: { username: string; password: string; name: string }[]; errors: { row: number; message: string }[] }>("/api/admin/teams/import", "POST", body);
      toast.success(`Imported ${result.created.length}. ${result.errors.length ? `${result.errors.length} rows need a look.` : ""}`);
      if (result.errors[0]) toast.error(`Row ${result.errors[0].row}: ${result.errors[0].message}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Squads</p>
          <h1 className="font-display text-4xl">{teams.length} on the floor</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOpen(true)}>Add squad</Button>
          <label className="inline-flex h-11 cursor-pointer items-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm">
            Import CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImport(file);
              event.target.value = "";
            }} />
          </label>
          <button type="button" className="inline-flex h-11 items-center rounded-lg border border-white/10 px-4 text-sm" onClick={() => { window.location.href = "/api/admin/teams/export"; }}>Export credentials</button>
          <Link className="inline-flex h-11 items-center rounded-lg border border-white/10 px-4 text-sm" href="/admin/credentials">Print passes</Link>
          <a className="inline-flex h-11 items-center text-sm text-neon" href="/squad-import-template.csv">CSV template</a>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search squad, college, ID" value={q} onChange={(event) => setQ(event.target.value)} className="max-w-xs" aria-label="Search squads" />
        <select className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm" value={track} onChange={(event) => setTrack(event.target.value)} aria-label="Filter by track">
          <option value="ALL">All tracks</option>
          {TRACKS.map((item) => <option key={item.id} value={item.id}>{item.short}</option>)}
        </select>
      </div>
      {error ? <p className="text-danger">{error}</p> : null}
      {!teams.length && !error ? <div className="h-24 animate-pulse rounded-xl bg-white/5" /> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="py-2">ID</th>
              <th>Squad</th>
              <th>Track</th>
              <th>Rank</th>
              <th>Gates</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((team) => (
              <tr key={team.id} className="border-t border-white/10">
                <td className="py-3 font-mono text-xs">{team.code}</td>
                <td>
                  <div>{team.name} {team.isFinalist ? <Badge tone="gold">Finalist</Badge> : null}</div>
                  <div className="text-xs text-muted">{team.college}</div>
                </td>
                <td>{trackById(team.track).short}</td>
                <td className="font-mono">{team.rank ?? "—"} <span className="text-muted">{team.total?.toFixed(1) ?? ""}</span></td>
                <td className="font-mono">{team.completedCount}/5</td>
                <td className="text-right">
                  <Link className="text-neon" href={`/admin/teams/${team.id}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {teams.length && !shown.length ? <p className="py-6 text-muted">No squad matches that filter.</p> : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen} title="New squad" description="A team ID and password are generated. Hand the pass to the squad lead.">
        <form className="space-y-3" onSubmit={createTeam}>
          <div><Label htmlFor="name">Squad name</Label><Input id="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div>
          <div><Label htmlFor="college">College</Label><Input id="college" value={form.college} onChange={(event) => setForm({ ...form, college: event.target.value })} required /></div>
          <div>
            <Label htmlFor="track">Track</Label>
            <select id="track" className="h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3" value={form.track} onChange={(event) => setForm({ ...form, track: event.target.value })}>
              {TRACKS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div><Label htmlFor="members">Members, one per line (2–4)</Label><Textarea id="members" value={form.members} onChange={(event) => setForm({ ...form, members: event.target.value })} required /></div>
          <div><Label htmlFor="password">Password (optional)</Label><Input id="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Leave blank to generate one" /></div>
          <Button type="submit">Create squad</Button>
        </form>
      </Dialog>
      <Dialog open={Boolean(issued)} onOpenChange={(next) => { if (!next) setIssued(null); }} title="Credential issued" description="Copy this now. It is also on the pass and in the CSV export.">
        {issued ? (
          <div className="space-y-3">
            <p className="font-mono text-sm">{issued.username}</p>
            <p className="font-mono text-lg">{issued.password}</p>
            <Button variant="ghost" onClick={() => void copyText(`${issued.username} / ${issued.password}`).then(() => toast.success("Copied."))}>Copy</Button>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
