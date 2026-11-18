"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { send } from "@/components/client";
import { Button, Input, Label, Textarea } from "@/components/ui";

type Gate = {
  id: string;
  code: string;
  name: string;
  summary: string;
  openOffsetMin: number;
  closeOffsetMin: number;
  maxPoints: number;
  fileRequired: boolean;
  requireGithub: boolean;
  requireDemo: boolean;
  requireVideo: boolean;
};

export default function MilestonesPage() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void send<{ milestones: Gate[] }>("/api/admin/milestones", "GET")
        .then((data) => setGates(data.milestones))
        .catch((err) => setError(err.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function update(id: string, patch: Partial<Gate>) {
    setGates((current) => current.map((gate) => (gate.id === id ? { ...gate, ...patch } : gate)));
  }

  if (error) return <p className="text-danger">{error}</p>;
  if (!gates.length) return <div className="h-40 animate-pulse rounded-xl bg-white/5" />;

  return (
    <div className="space-y-4">
      <div>
        <p className="kicker">Gates</p>
        <h1 className="font-display text-4xl">Milestone windows</h1>
        <p className="mt-1 max-w-2xl text-muted">Times are minutes from kickoff. The defaults follow the 20-hour sprint: blueprint lock at hour 4, core at 10, feature at 16, freeze at 20.</p>
      </div>
      <div className="grid gap-4">
        {gates.map((gate) => (
          <article key={gate.id} className="frame grid gap-3 p-4 md:grid-cols-2">
            <div>
              <p className="kicker">{gate.code}</p>
              <Label htmlFor={`${gate.id}-name`}>Name</Label>
              <Input id={`${gate.id}-name`} value={gate.name} onChange={(event) => update(gate.id, { name: event.target.value })} />
              <Label htmlFor={`${gate.id}-sum`} className="mt-3">What squads must show</Label>
              <Textarea id={`${gate.id}-sum`} value={gate.summary} onChange={(event) => update(gate.id, { summary: event.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Opens (min)" value={gate.openOffsetMin} onChange={(value) => update(gate.id, { openOffsetMin: value })} />
              <Field label="Closes (min)" value={gate.closeOffsetMin} onChange={(value) => update(gate.id, { closeOffsetMin: value })} />
              <Field label="Max points" value={gate.maxPoints} onChange={(value) => update(gate.id, { maxPoints: value })} />
              <div className="col-span-2 space-y-1 text-sm">
                <Check label="File required to complete" checked={gate.fileRequired} onChange={(fileRequired) => update(gate.id, { fileRequired })} />
                <Check label="GitHub required to complete" checked={gate.requireGithub} onChange={(requireGithub) => update(gate.id, { requireGithub })} />
                <Check label="Demo link required to complete" checked={gate.requireDemo} onChange={(requireDemo) => update(gate.id, { requireDemo })} />
                <Check label="Video required to complete" checked={gate.requireVideo} onChange={(requireVideo) => update(gate.id, { requireVideo })} />
              </div>
            </div>
          </article>
        ))}
      </div>
      <Button onClick={() => void send("/api/admin/milestones", "PATCH", {
        milestones: gates.map((gate) => ({
          ...gate,
          openOffsetMin: Number(gate.openOffsetMin),
          closeOffsetMin: Number(gate.closeOffsetMin),
          maxPoints: Number(gate.maxPoints),
        })),
      }).then(() => toast.success("Gates saved.")).catch((err) => toast.error(err.message))}>
        Save gates
      </Button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="text-sm text-muted">
      {label}
      <Input type="number" className="mt-1" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
