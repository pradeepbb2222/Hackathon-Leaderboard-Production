import { getBoard, toPublicBoard } from "@/lib/board";
import { subscribeBoard } from "@/lib/live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let close: () => void = () => undefined;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      // Pad past common proxy buffers (nginx, tunnels) so the first event flushes.
      controller.enqueue(encoder.encode(`:${" ".repeat(2048)}\n\n`));
      try {
        send(toPublicBoard(await getBoard()));
      } catch (error) {
        console.error(error);
        send({ error: "Leaderboard is not ready yet." });
      }
      const unsubscribe = subscribeBoard((board) => {
        try {
          send(toPublicBoard(board));
        } catch {
          close();
        }
      });
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          close();
        }
      }, 15000);
      close = () => {
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
    },
    cancel() {
      close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "identity",
    },
  });
}
