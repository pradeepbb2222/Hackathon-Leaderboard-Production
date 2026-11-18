import { emitBoard, onBoard, registerPublisher } from "@/lib/bus";
import { getBoard, invalidateBoard } from "@/lib/board";
import { notifyBoard, startBoardListener } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import type { BoardPayload } from "@/lib/types";

const globalLive = globalThis as unknown as {
  cbLive?: { timer?: NodeJS.Timeout; cleanup?: NodeJS.Timeout; registered?: boolean };
};

function slot() {
  if (!globalLive.cbLive) globalLive.cbLive = {};
  return globalLive.cbLive;
}

async function broadcast() {
  invalidateBoard();
  emitBoard(await getBoard(true));
}

export function startLiveLoop() {
  if (process.env.NODE_ENV === "test") return;
  const live = slot();
  if (!live.registered) {
    live.registered = true;
    registerPublisher(async () => {
      await broadcast();
      await notifyBoard();
    });
    startBoardListener(() => {
      void broadcast().catch((error) => console.error("notify refresh", error));
    });
  }
  if (live.timer) return;
  live.timer = setInterval(() => {
    void getBoard()
      .then((board) => emitBoard(board))
      .catch((error) => {
        if (error && typeof error === "object" && "code" in error && error.code === "P2025") return;
        console.error("live loop", error);
      });
  }, 3000);
  live.cleanup = setInterval(() => {
    void prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => undefined);
  }, 60_000);
  void import("@/lib/simulator").then((mod) => mod.startSimulator());
}

export function subscribeBoard(listener: (board: BoardPayload) => void) {
  startLiveLoop();
  return onBoard(listener);
}

export async function publishBoard() {
  startLiveLoop();
  await broadcast();
  await notifyBoard();
}
