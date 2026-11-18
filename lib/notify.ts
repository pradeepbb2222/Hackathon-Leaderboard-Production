import { Client } from "pg";
import { prisma } from "@/lib/prisma";

const CHANNEL = "cb_board";

export async function notifyBoard() {
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("postgres")) return;
  await prisma.$executeRawUnsafe(`SELECT pg_notify('${CHANNEL}', 'refresh')`);
}

export function startBoardListener(onNotify: () => void) {
  const globalListener = globalThis as unknown as { cbListen?: Client };
  if (globalListener.cbListen) return;
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("postgres")) return;
  const client = new Client({ connectionString: url });
  globalListener.cbListen = client;
  client.on("notification", () => onNotify());
  client.on("error", (error) => {
    console.error("board listener", error);
    globalListener.cbListen = undefined;
    setTimeout(() => startBoardListener(onNotify), 3000);
  });
  void client
    .connect()
    .then(() => client.query(`LISTEN ${CHANNEL}`))
    .catch((error) => {
      console.error("board listener connect", error);
      globalListener.cbListen = undefined;
    });
}
