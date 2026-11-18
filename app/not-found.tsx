import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="kicker">404</p>
      <h1 className="mt-2 font-display text-4xl">That page is not on the floor.</h1>
      <p className="mt-3 text-muted">The live board is still running.</p>
      <Link href="/" className="mt-6 text-neon">Back to the leaderboard</Link>
    </div>
  );
}
