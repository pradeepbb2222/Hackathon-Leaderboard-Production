"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="kicker">Something went wrong</p>
      <h1 className="mt-2 font-display text-4xl">This page could not finish loading.</h1>
      <p className="mt-3 text-muted">Try again. If it keeps happening, tell the organizer.</p>
      <button className="mt-6 text-left text-neon" onClick={() => reset()}>Try again</button>
    </main>
  );
}
