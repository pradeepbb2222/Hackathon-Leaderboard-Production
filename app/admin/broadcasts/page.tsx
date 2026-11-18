"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { send } from "@/components/client";
import { Button, Input, Label, Textarea } from "@/components/ui";

type Item = { id: string; title: string; body: string; author: string; createdAt: string };

export default function BroadcastsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function load() {
    const data = await send<{ announcements: Item[] }>("/api/admin/announcements", "GET");
    setItems(data.announcements);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch((err) => toast.error(err.message)), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="kicker">Broadcasts</p>
        <h1 className="font-display text-4xl">Tell every squad</h1>
      </div>
      <form
        className="frame space-y-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void send("/api/admin/announcements", "POST", { title, body })
            .then(() => {
              setTitle("");
              setBody("");
              toast.success("Sent to every squad, and onto the live ticker.");
              return load();
            })
            .catch((err) => toast.error(err.message));
        }}
      >
        <div><Label htmlFor="title">Title</Label><Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required /></div>
        <div><Label htmlFor="body">Message</Label><Textarea id="body" value={body} onChange={(event) => setBody(event.target.value)} required /></div>
        <Button type="submit">Broadcast</Button>
      </form>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="frame p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl">{item.title}</h2>
                <p className="mt-1 text-sm">{item.body}</p>
                <p className="mt-2 text-xs text-muted">{item.author} · {new Date(item.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
              </div>
              <button className="text-sm text-danger" onClick={() => void send("/api/admin/announcements", "DELETE", { id: item.id }).then(load)}>Remove</button>
            </div>
          </li>
        ))}
        {!items.length ? <li className="text-muted">No broadcasts yet. The floor is quiet.</li> : null}
      </ul>
    </div>
  );
}
