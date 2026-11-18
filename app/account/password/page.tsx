"use client";

import { useState } from "react";
import { toast } from "sonner";
import { send } from "@/components/client";
import { Button, Input, Label } from "@/components/ui";

export default function PasswordPage() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <form
        className="frame w-full space-y-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          void send("/api/auth/password", "POST", { currentPassword, newPassword })
            .then(() => {
              toast.success("Password updated.");
              window.location.href = "/login";
            })
            .catch((error: Error) => {
              toast.error(error.message);
              setBusy(false);
            });
        }}
      >
        <p className="kicker">First sign-in</p>
        <h1 className="font-display text-3xl">Choose your own password</h1>
        <p className="text-sm text-muted">The temporary password stops working for daily use after this. Write the new one down.</p>
        <div>
          <Label htmlFor="current">Temporary password</Label>
          <Input id="current" type="password" value={currentPassword} onChange={(event) => setCurrent(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="next">New password</Label>
          <Input id="next" type="password" minLength={8} value={newPassword} onChange={(event) => setNext(event.target.value)} required />
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save password"}</Button>
      </form>
    </main>
  );
}
