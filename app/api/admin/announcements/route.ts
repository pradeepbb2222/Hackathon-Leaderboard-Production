import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { api, json, readJson } from "@/lib/http";
import { publishBoard } from "@/lib/live";
import { prisma } from "@/lib/prisma";

export const GET = api(async (req) => {
  await requireUser(req, ["ADMIN"]);
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { displayName: true } } },
  });
  return json({
    announcements: announcements.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      author: item.author?.displayName ?? "Ops",
      createdAt: item.createdAt.toISOString(),
    })),
  });
});

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(1000),
});

export const POST = api(async (req) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const body = schema.parse(await readJson(req));
  const created = await prisma.announcement.create({
    data: { title: body.title, body: body.body, authorId: admin.id },
  });
  await audit(admin, "announcement.create", "announcement", created.id, { title: body.title });
  await publishBoard();
  return json({ ok: true, id: created.id });
});

export const DELETE = api(async (req) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const body = z.object({ id: z.string() }).parse(await readJson(req));
  await prisma.announcement.delete({ where: { id: body.id } });
  await audit(admin, "announcement.delete", "announcement", body.id);
  await publishBoard();
  return json({ ok: true });
});
