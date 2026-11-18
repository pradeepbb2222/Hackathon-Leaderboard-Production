import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { hashPassword, newSessionToken } from "../lib/passwords";

const prisma = new PrismaClient();

test("a squad can upload a large file and another squad cannot download it", async () => {
  const stamp = Date.now().toString();
  const passwordHash = await hashPassword("upload-pass");
  await prisma.eventState.update({
    where: { id: "event" },
    data: { startsAt: new Date(Date.now() - 6.5 * 60 * 60 * 1000), paused: false, pausedAt: null, accumulatedPauseMs: 0, submissionsLocked: false },
  });
  const team = await prisma.team.create({
    data: { code: `UP-${stamp}`, name: "Upload Squad", track: "REGENERAX", college: "Test", members: "[]" },
  });
  const other = await prisma.team.create({
    data: { code: `UP2-${stamp}`, name: "Other Squad", track: "LEARNING", college: "Test", members: "[]" },
  });
  const user = await prisma.user.create({
    data: { username: `up-${stamp}`, passwordHash, role: "TEAM", displayName: "Up", teamId: team.id },
  });
  const intruder = await prisma.user.create({
    data: { username: `up2-${stamp}`, passwordHash, role: "TEAM", displayName: "No", teamId: other.id },
  });
  const issued = newSessionToken();
  await prisma.session.create({
    data: { userId: user.id, tokenHash: issued.tokenHash, expiresAt: new Date(Date.now() + 3600_000) },
  });
  const intruderToken = newSessionToken();
  await prisma.session.create({
    data: { userId: intruder.id, tokenHash: intruderToken.tokenHash, expiresAt: new Date(Date.now() + 3600_000) },
  });

  const { POST: sign } = await import("../app/api/team/milestones/[id]/uploads/route");
  const { POST: complete } = await import("../app/api/team/milestones/[id]/uploads/[fileId]/complete/route");
  const { GET: download } = await import("../app/api/team/files/[fileId]/route");

  const size = 8 * 1024 * 1024;
  const body = Buffer.alloc(size, 7);
  const signed = await sign(
    new NextRequest("http://localhost/api/team/milestones/m3/uploads", {
      method: "POST",
      headers: { cookie: `cb_session=${issued.cookie}`, "content-type": "application/json" },
      body: JSON.stringify({ fileName: "large.pdf", contentType: "application/pdf", size }),
    }),
    { params: Promise.resolve({ id: "m3" }) },
  );
  assert.equal(signed.status, 200);
  const payload = await signed.json();
  const put = await fetch(payload.uploadUrl, {
    method: "PUT",
    headers: payload.headers,
    body,
  });
  assert.equal(put.ok, true, `upload status ${put.status}`);
  const done = await complete(
    new NextRequest(`http://localhost/api/team/milestones/m3/uploads/${payload.fileId}/complete`, {
      method: "POST",
      headers: { cookie: `cb_session=${issued.cookie}`, "content-type": "application/json" },
      body: "{}",
    }),
    { params: Promise.resolve({ id: "m3", fileId: payload.fileId }) },
  );
  assert.equal(done.status, 200);

  const own = await download(
    new NextRequest("http://localhost/api/team/files/" + payload.fileId, { headers: { cookie: `cb_session=${issued.cookie}` } }),
    { params: Promise.resolve({ fileId: payload.fileId }) },
  );
  assert.ok(own.status === 200 || own.status === 302);

  const stolen = await download(
    new NextRequest("http://localhost/api/team/files/" + payload.fileId, {
      headers: { cookie: `cb_session=${intruderToken.cookie}` },
    }),
    { params: Promise.resolve({ fileId: payload.fileId }) },
  );
  assert.equal(stolen.status, 404);

  await prisma.submissionFile.deleteMany({ where: { id: payload.fileId } });
  await prisma.submission.deleteMany({ where: { teamId: { in: [team.id, other.id] } } });
  await prisma.session.deleteMany({ where: { userId: { in: [user.id, intruder.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [user.id, intruder.id] } } });
  await prisma.team.deleteMany({ where: { id: { in: [team.id, other.id] } } });
});
