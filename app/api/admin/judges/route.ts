import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { api, json, readJson } from "@/lib/http";
import { generatePassword, hashPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

export const GET = api(async (req) => {
  await requireUser(req, ["ADMIN"]);
  const judges = await prisma.judge.findMany({
    include: {
      user: true,
      assignments: { select: { teamId: true, team: { select: { code: true, name: true, track: true } } } },
      scores: { select: { teamId: true, status: true } },
    },
    orderBy: { user: { username: "asc" } },
  });
  return json({
    judges: judges.map((judge) => ({
      id: judge.id,
      userId: judge.userId,
      username: judge.user.username,
      name: judge.user.displayName,
      title: judge.title,
      password: judge.user.issuedPassword ?? "",
      assigned: judge.assignments.length,
      submitted: judge.scores.filter((score) => score.status === "SUBMITTED").length,
      drafts: judge.scores.filter((score) => score.status === "DRAFT").length,
      assignments: judge.assignments.map((item) => ({
        teamId: item.teamId,
        code: item.team.code,
        name: item.team.name,
        track: item.team.track,
      })),
    })),
  });
});

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(80),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/, "Username can use letters, numbers, dot, dash."),
  password: z.string().min(8).max(80).optional(),
});

export const POST = api(async (req) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const body = schema.parse(await readJson(req));
  const password = body.password?.trim() || generatePassword();
  const passwordHash = await hashPassword(password);
  const judge = await prisma.judge.create({
    data: {
      title: body.title,
      user: {
        create: {
          username: body.username,
          displayName: body.name,
          passwordHash,
          issuedPassword: password,
          role: "JUDGE",
        },
      },
    },
    include: { user: true },
  });
  await audit(admin, "judge.create", "judge", judge.id, { username: body.username });
  return json({ id: judge.id, username: judge.user.username, password });
});
