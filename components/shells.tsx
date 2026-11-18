"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { cn } from "@/lib/cn";

const ADMIN_LINKS = [
  ["/admin", "Overview"],
  ["/admin/teams", "Squads"],
  ["/admin/judges", "Jury"],
  ["/admin/milestones", "Gates"],
  ["/admin/broadcasts", "Broadcasts"],
  ["/admin/audit", "Audit"],
  ["/admin/credentials", "Passes"],
];

export function AdminShell({
  user,
  children,
}: {
  user: { name: string; username: string };
  children: React.ReactNode;
}) {
  const path = usePathname();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="no-print border-b border-white/10 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-white/10">
        <div className="flex items-center justify-between gap-4 px-4 py-4 lg:block">
          <Wordmark href="/admin" compact />
          <p className="mt-3 hidden text-xs text-muted lg:block">
            {user.name}
            <span className="mt-1 block font-mono text-[11px] text-white/50">{user.username}</span>
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-3">
          {ADMIN_LINKS.map(([href, label]) => {
            const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "block shrink-0 rounded-lg px-3 py-2 text-sm",
                  active ? "bg-white/10 text-ink" : "text-muted hover:bg-white/5 hover:text-ink",
                )}
              >
                {label}
              </Link>
            );
          })}
          <Link href="/" className="block shrink-0 rounded-lg px-3 py-2 text-sm text-neon hover:bg-white/5">
            Live board
          </Link>
        </nav>
        <button
          className="m-3 hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 lg:flex"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>
      <div>
        <div className="no-print flex items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
          <span className="text-sm text-muted">{user.name}</span>
          <button className="text-sm text-muted" onClick={() => logout()}>
            Sign out
          </button>
        </div>
        <div className="px-4 py-5 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}

export function TopShell({
  eyebrow,
  title,
  user,
  children,
}: {
  eyebrow: string;
  title: string;
  user: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <Wordmark href="/" compact />
          <div className="text-right">
            <div className="kicker">{eyebrow}</div>
            <div className="text-sm">{title}</div>
            <button className="text-xs text-muted underline-offset-2 hover:underline" onClick={() => logout()}>
              Sign out · {user}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
    </div>
  );
}

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}
