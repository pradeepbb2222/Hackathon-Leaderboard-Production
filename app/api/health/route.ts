import { api, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { storagePing } from "@/lib/storage";

export const GET = api(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return json({ ok: false, database: "down", service: "codebharat-ops" }, 503);
  }
  const event = await prisma.eventState.findUnique({ where: { id: "event" } });
  let storage = "ok";
  try {
    await storagePing();
  } catch {
    storage = "down";
  }
  return json({
    ok: storage === "ok",
    database: "ok",
    storage,
    ready: Boolean(event),
    service: "codebharat-ops",
  }, storage === "ok" ? 200 : 503);
});
