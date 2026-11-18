import { requireUser } from "@/lib/auth";
import { api, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = api(async (req) => {
  await requireUser(req, ["ADMIN"]);
  const url = new URL(req.url);
  const take = Math.min(400, Math.max(1, Number(url.searchParams.get("take") || 200)));
  const q = (url.searchParams.get("q") || "").trim();
  const logs = await prisma.auditLog.findMany({
    where: q
      ? {
          OR: [
            { action: { contains: q } },
            { actorName: { contains: q } },
            { detail: { contains: q } },
            { entityType: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take,
  });
  return json({
    logs: logs.map((log) => ({
      id: log.id,
      actorName: log.actorName,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      detail: log.detail,
      createdAt: log.createdAt.toISOString(),
    })),
  });
});
