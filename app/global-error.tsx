"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", background: "#07080c", color: "#f6f3ec", padding: "2rem" }}>
        <h1>The floor app hit an error.</h1>
        <p>Refresh the page. If you are the deployer, check the server logs.</p>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
