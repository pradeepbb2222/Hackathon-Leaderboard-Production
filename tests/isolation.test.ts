import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { newSessionToken } from "../lib/passwords";
import { hashPassword } from "../lib/passwords";

const prisma = new PrismaClient();

async function sessionCookie(userId: string) {
  const issued = newSessionToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: issued.tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return `cb_session=${issued.cookie}`;
}

test("team A cannot read team B, and a judge only sees assigned work", async () => {
  const stamp = Date.now().toString();
  const passwordHash = await hashPassword("isolation-pass");
  const teamA = await prisma.team.create({
    data: {
      code: `ZZ-${stamp}-A`,
      name: "Isolation A",
      track: "LEARNING",
      college: "Test College",
      members: "[]",
    },
  });
  const teamB = await prisma.team.create({
    data: {
      code: `ZZ-${stamp}-B`,
      name: "Isolation B",
      track: "FARMING",
      college: "Test College",
      members: "[]",
    },
  });
  const userA = await prisma.user.create({
    data: { username: `zza-${stamp}`, passwordHash, role: "TEAM", displayName: "A", teamId: teamA.id },
  });
  const userB = await prisma.user.create({
    data: { username: `zzb-${stamp}`, passwordHash, role: "TEAM", displayName: "B", teamId: teamB.id },
  });
  const judgeUser = await prisma.user.create({
    data: { username: `zzj-${stamp}`, passwordHash, role: "JUDGE", displayName: "J" },
  });
  const judge = await prisma.judge.create({ data: { userId: judgeUser.id, title: "Test" } });
  await prisma.judgeAssignment.create({ data: { judgeId: judge.id, teamId: teamA.id } });
  const milestone = await prisma.milestone.findFirst();
  assert.ok(milestone, "production seed must create gates before this test");
  const submission = await prisma.submission.create({
    data: { teamId: teamB.id, milestoneId: milestone.id, statusText: "secret plan", progress: 10 },
  });
  const file = await prisma.submissionFile.create({
    data: {
      submissionId: submission.id,
      originalName: "secret.pdf",
      storedName: `tests/${stamp}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 12,
      confirmed: true,
    },
  });

  const { GET: teamFile } = await import("../app/api/team/files/[fileId]/route");
  const { GET: adminOverview } = await import("../app/api/admin/overview/route");
  const { GET: judgeFile } = await import("../app/api/judge/files/[fileId]/route");
  const { GET: teamDash } = await import("../app/api/team/dashboard/route");

  const cookieA = await sessionCookie(userA.id);
  const cookieB = await sessionCookie(userB.id);
  const cookieJ = await sessionCookie(judgeUser.id);

  const stolen = await teamFile(
    new NextRequest("http://localhost/api/team/files/" + file.id, { headers: { cookie: cookieA } }),
    { params: Promise.resolve({ fileId: file.id }) },
  );
  assert.equal(stolen.status, 404);

  const ownDash = await teamDash(
    new NextRequest("http://localhost/api/team/dashboard", { headers: { cookie: cookieB } }),
    { params: Promise.resolve({}) },
  );
  const dash = await ownDash.json();
  assert.equal(dash.team.code, teamB.code);
  assert.equal(JSON.stringify(dash).includes("Isolation A"), false);

  const asAdmin = await adminOverview(
    new NextRequest("http://localhost/api/admin/overview", { headers: { cookie: cookieB } }),
    { params: Promise.resolve({}) },
  );
  assert.equal(asAdmin.status, 403);

  const judgeDenied = await judgeFile(
    new NextRequest("http://localhost/api/judge/files/" + file.id, { headers: { cookie: cookieJ } }),
    { params: Promise.resolve({ fileId: file.id }) },
  );
  assert.equal(judgeDenied.status, 404);

  await prisma.submissionFile.delete({ where: { id: file.id } });
  await prisma.submission.delete({ where: { id: submission.id } });
  await prisma.judgeAssignment.deleteMany({ where: { judgeId: judge.id } });
  await prisma.judge.delete({ where: { id: judge.id } });
  await prisma.session.deleteMany({ where: { userId: { in: [userA.id, userB.id, judgeUser.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id, judgeUser.id] } } });
  await prisma.team.deleteMany({ where: { id: { in: [teamA.id, teamB.id] } } });
});
