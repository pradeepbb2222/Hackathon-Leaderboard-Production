"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { send } from "@/components/client";
import { Button, Dialog, Input, Label } from "@/components/ui";
import { TRACKS } from "@/lib/tracks";

type Judge = {
  id: string;
  username: string;
  name: string;
  title: string;
  password: string;
  assigned: number;
  submitted: number;
  drafts: number;
  assignments: { teamId: string; code: string; name: string; track: string }[];
};

export default function JudgesPage() {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", title: "Jury", username: "", password: "" });
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);
  const [active, setActive] = useState<string>("");
  const [track, setTrack] = useState("REGENERAX");

  async function load() {
    const data = await send<{ judges: Judge[] }>("/api/admin/judges", "GET");
    setJudges(data.judges);
    setActive((current) => current || data.judges[0]?.id || "");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch((err) => toast.error(err.message)), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const current = judges.find((judge) => judge.id === active);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Jury</p>
          <h1 className="font-display text-4xl">Who marks whom</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpen(true)}>Add judge</Button>
          <button className="inline-flex h-11 items-center rounded-lg border border-white/10 px-4 text-sm" onClick={() => { window.location.href = "/api/admin/judges/export"; }}>Export jury CSV</button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <ul className="space-y-2">
          {judges.map((judge) => (
            <li key={judge.id}>
              <button className={`w-full rounded-lg border px-3 py-3 text-left ${judge.id === active ? "border-saffron/50 bg-white/5" : "border-white/10"}`} onClick={() => setActive(judge.id)}>
                <div>{judge.name}</div>
                <div className="text-xs text-muted">{judge.username} · scored {judge.submitted}/{judge.assigned}</div>
              </button>
            </li>
          ))}
          {!judges.length ? <li className="text-muted">No jury accounts yet.</li> : null}
        </ul>
        {current ? (
          <div className="frame p-4">
            <h2 className="font-display text-2xl">{current.name}</h2>
            <p className="text-sm text-muted">{current.title}</p>
            <p className="mt-2 font-mono text-sm">{current.username} / {current.password}</p>
            <p className="mt-1 text-sm text-muted">{current.drafts} drafts · {current.submitted} submitted · other judges never see these raw marks.</p>
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor="assign-track">Assign a whole track</Label>
                <select id="assign-track" className="h-11 rounded-lg border border-white/10 bg-black/30 px-3" value={track} onChange={(event) => setTrack(event.target.value)}>
                  {TRACKS.map((item) => <option key={item.id} value={item.id}>{item.short}</option>)}
                </select>
              </div>
              <Button variant="ghost" onClick={() => void send(`/api/admin/judges/${current.id}/assignments`, "POST", { track }).then(() => { toast.success("Track assigned."); return load(); }).catch((err) => toast.error(err.message))}>Assign</Button>
              <Button variant="ghost" onClick={() => void send<{ password: string }>(`/api/admin/judges/${current.id}/password`, "POST").then((result) => { toast.success(`New password ${result.password}`); return load(); })}>Reset password</Button>
              <Button variant="danger" onClick={() => void send(`/api/admin/judges/${current.id}`, "DELETE").then(() => { toast.success("Judge removed."); setActive(""); return load(); }).catch((err) => toast.error(err.message))}>Remove</Button>
            </div>
            <ul className="mt-4 max-h-80 space-y-1 overflow-auto text-sm">
              {current.assignments.map((item) => (
                <li key={item.teamId} className="flex items-center justify-between gap-2 border-t border-white/10 py-1">
                  <span className="font-mono text-xs">{item.code}</span>
                  <span className="flex-1">{item.name}</span>
                  <button className="text-muted" onClick={() => void send(`/api/admin/judges/${current.id}/assignments`, "POST", { removeTeamId: item.teamId }).then(load)}>Remove</button>
                </li>
              ))}
              {!current.assignments.length ? <li className="text-muted">No squads assigned.</li> : null}
            </ul>
          </div>
        ) : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen} title="New judge">
        <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault();
          void send<{ username: string; password: string }>("/api/admin/judges", "POST", form).then((result) => {
            setIssued(result);
            setOpen(false);
            setForm({ name: "", title: "Jury", username: "", password: "" });
            return load();
          }).catch((err) => toast.error(err.message));
        }}>
          <div><Label htmlFor="jname">Name</Label><Input id="jname" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div>
          <div><Label htmlFor="jtitle">Title</Label><Input id="jtitle" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></div>
          <div><Label htmlFor="juser">Username</Label><Input id="juser" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required /></div>
          <div><Label htmlFor="jpass">Password (optional)</Label><Input id="jpass" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></div>
          <Button type="submit">Create judge</Button>
        </form>
      </Dialog>
      <Dialog open={Boolean(issued)} onOpenChange={() => setIssued(null)} title="Judge credential">
        {issued ? <p className="font-mono">{issued.username} / {issued.password}</p> : null}
      </Dialog>
    </div>
  );
}
