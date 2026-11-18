import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

export async function audit(
  actor: Pick<SessionUser, "id" | "displayName"> | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  detail?: unknown,
) {
  await prisma.auditLog.create({
    data: {
      actorId: actor?.id,
      actorName: actor?.displayName ?? "system",
      action,
      entityType,
      entityId: entityId ?? undefined,
      detail: detail ? JSON.stringify(detail).slice(0, 2000) : "",
    },
  });
}
