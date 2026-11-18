"use client";

import { useEffect, useState } from "react";
import { send } from "@/components/client";
import { Input } from "@/components/ui";

type Log = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  detail: string;
  createdAt: string;
};

export default function AuditPage() {
  const [q, setQ] = useState("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const query = q ? `?q=${encodeURIComponent(q)}` : "";
      void send<{ logs: Log[] }>(`/api/admin/audit${query}`, "GET")
        .then((data) => {
          setLogs(data.logs);
          setError("");
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load the audit."));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [q]);

  return (
    <div className="space-y-4">
      <div>
        <p className="kicker">Audit</p>
        <h1 className="font-display text-4xl">What changed</h1>
      </div>
      <Input placeholder="Filter by person or action" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Filter audit" className="max-w-sm" />
      {error ? <p className="text-danger">{error} <button className="text-neon" onClick={() => setQ((value) => value)}>Retry</button></p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr><th className="py-2">When</th><th>Who</th><th>Action</th><th>Detail</th></tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-white/10 align-top">
                <td className="py-2 font-mono text-xs text-muted">{new Date(log.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td>{log.actorName}</td>
                <td className="font-mono text-xs">{log.action}</td>
                <td className="max-w-md text-muted">{log.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.length && !error ? <p className="py-6 text-muted">{q ? "Nothing matches that filter." : "The log is empty."}</p> : null}
      </div>
    </div>
  );
}
