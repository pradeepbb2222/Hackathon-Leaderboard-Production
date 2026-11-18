import { EventEmitter } from "node:events";
import type { BoardPayload } from "@/lib/types";

const globalBus = globalThis as unknown as {
  cbBus?: { emitter: EventEmitter; publish?: () => Promise<void> };
};

function state() {
  if (!globalBus.cbBus) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(500);
    globalBus.cbBus = { emitter };
  }
  return globalBus.cbBus;
}

export function emitBoard(board: BoardPayload) {
  state().emitter.emit("board", board);
}

export function onBoard(listener: (board: BoardPayload) => void) {
  const emitter = state().emitter;
  emitter.on("board", listener);
  return () => emitter.off("board", listener);
}

export function registerPublisher(fn: () => Promise<void>) {
  state().publish = fn;
}

export async function requestPublish() {
  await state().publish?.();
}
