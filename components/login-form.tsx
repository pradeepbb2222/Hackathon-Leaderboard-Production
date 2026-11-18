"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { PhaseRail, Wordmark } from "@/components/brand";
import { send } from "@/components/client";
import { Button, Input, Label } from "@/components/ui";

const DEMOS = [
  { role: "Organizer", username: "admin", password: "admin@123" },
  { role: "Squad", username: "CB26-T001", password: "team@123" },
  { role: "Jury", username: "judge01", password: "judge@123" },
];

export function LoginForm({
  presetUser,
  showDemo,
  name,
  edition,
  venue,
  dates,
  theme,
}: {
  presetUser: string;
  showDemo: boolean;
  name: string;
  edition: string;
  venue: string;
  dates: string;
  theme: string;
}) {
  const [username, setUsername] = useState(presetUser);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hideDemo, setHideDemo] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await send<{ redirect: string }>("/api/auth/login", "POST", { username, password });
      window.location.assign(result.redirect);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-white/10 px-10 py-10 lg:flex">
        <Wordmark name={name} edition={edition} />
        <div>
          <p className="kicker">Savishkar India · SASA Engineers</p>
          <h1 className="mt-3 max-w-lg font-display text-5xl leading-tight">{theme}</h1>
          <p className="mt-4 max-w-md text-muted">
            20-hour sprint at {venue}, {dates}. Architecture first. Then the build. Top 25 reach the grand stage.
          </p>
          <PhaseRail elapsedMs={6.3 * 3600000} />
          <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="frame p-3"><dt className="kicker">Squads</dt><dd className="mt-1 font-display text-2xl">150</dd></div>
            <div className="frame p-3"><dt className="kicker">Finalists</dt><dd className="mt-1 font-display text-2xl">25</dd></div>
            <div className="frame p-3"><dt className="kicker">Winner</dt><dd className="mt-1 font-display text-2xl">₹50k</dd></div>
          </dl>
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Venue · IIIT Dharwad Research Park</p>
      </section>
      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Wordmark name={name} edition={edition} compact />
          </div>
          <div className="frame p-6">
            <p className="kicker">Operations sign-in</p>
            <h2 className="mt-2 font-display text-3xl">Enter the floor.</h2>
            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="pr-12" />
                  <button type="button" className="absolute right-3 top-2.5 text-muted" onClick={() => setShow((value) => !value)} aria-label={show ? "Hide password" : "Show password"}>
                    {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Checking…" : "Sign in"}</Button>
            </form>
          </div>
          {showDemo && !hideDemo ? (
            <div className="frame mt-4 p-4">
              <div className="flex items-center justify-between">
                <p className="kicker">Demo credentials</p>
                <button className="text-xs text-muted" onClick={() => setHideDemo(true)}>Dismiss</button>
              </div>
              <ul className="mt-3 space-y-2">
                {DEMOS.map((demo) => (
                  <li key={demo.username} className="flex items-center justify-between gap-3 rounded-lg bg-black/25 px-3 py-2 text-sm">
                    <span>
                      <span className="block text-muted">{demo.role}</span>
                      <span className="font-mono text-xs">{demo.username} / {demo.password}</span>
                    </span>
                    <button
                      className="text-neon"
                      onClick={() => {
                        setUsername(demo.username);
                        setPassword(demo.password);
                      }}
                    >
                      Use
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
