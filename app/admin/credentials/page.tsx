"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { send } from "@/components/client";
import { Button } from "@/components/ui";
import { trackById } from "@/lib/tracks";

type Card = {
  code: string;
  name: string;
  track: string;
  college: string;
  members: { name: string; role: string }[];
  username: string;
  password: string;
};

export default function CredentialsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void send<{ cards: Card[] }>("/api/admin/credentials", "GET")
        .then((data) => setCards(data.cards))
        .catch((err) => setError(err.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Passes</p>
          <h1 className="font-display text-4xl">Credential cards</h1>
          <p className="text-muted">Print and hand one card to each squad lead. The password is their login.</p>
        </div>
        <Button onClick={() => window.print()}>Print</Button>
      </div>
      {!cards.length && !error ? <div className="h-40 animate-pulse rounded-xl bg-white/5" /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <article key={card.code} className="pass-card rounded-2xl bg-[#f6f3ec] p-4 text-[#1a140f]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a5a2a]">CodeBharat 2026 · Squad pass</p>
                <h2 className="font-display text-2xl leading-tight">{card.name}</h2>
                <p className="text-sm">{card.college}</p>
                <p className="text-sm">{trackById(card.track).name}</p>
              </div>
              <PassQr value={`${typeof window !== "undefined" ? window.location.origin : ""}/login?u=${encodeURIComponent(card.username)}`} />
            </div>
            <p className="mt-3 text-xs">{card.members.map((member) => member.name).join(" · ")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white p-3 font-mono text-sm">
              <div><div className="text-[10px] uppercase tracking-wider text-[#8a5a2a]">Login</div>{card.username}</div>
              <div><div className="text-[10px] uppercase tracking-wider text-[#8a5a2a]">Password</div>{card.password}</div>
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[#6d645b]">IIIT Dharwad · 3–4 Dec 2026 · Savishkar India · SASA Engineers</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function PassQr({ value }: { value: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let live = true;
    void QRCode.toDataURL(value, { margin: 1, width: 180, color: { dark: "#1a140f", light: "#ffffff" } }).then((url) => {
      if (live) setSrc(url);
    });
    return () => {
      live = false;
    };
  }, [value]);
  if (!src) return <div className="h-16 w-16 bg-white" />;
  return (
    // QR codes are generated in the browser as data URLs for print.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-16 w-16 rounded bg-white" />
  );
}
