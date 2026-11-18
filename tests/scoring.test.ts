import assert from "node:assert/strict";
import test from "node:test";
import { milestoneState } from "../lib/clock";
import { judgeScore, progressScore, totalScore } from "../lib/scoring";
import { checkUpload } from "../lib/uploads";

test("progress score uses milestone points", () => {
  const score = progressScore(
    [
      { milestoneId: "m1", progress: 100 },
      { milestoneId: "m2", progress: 50 },
    ],
    [
      { id: "m1", maxPoints: 10 },
      { id: "m2", maxPoints: 20 },
      { id: "m3", maxPoints: 70 },
    ],
  );
  assert.equal(score, 20);
});

test("draft judge marks do not count", () => {
  const score = judgeScore([
    { status: "DRAFT", engineering: 10, impact: 10, prototype: 10, vision: 10 },
    { status: "SUBMITTED", engineering: 8, impact: 6, prototype: 8, vision: 6 },
  ]);
  assert.equal(score, 70);
});

test("missing jury marks count as zero in the total", () => {
  assert.equal(totalScore(50, null, 40, 60), 20);
  assert.equal(totalScore(50, 80, 40, 60), 68);
});

test("a gate is late only after it closes", () => {
  assert.equal(milestoneState(90, 240, 60 * 60 * 1000), "upcoming");
  assert.equal(milestoneState(90, 240, 120 * 60 * 1000), "open");
  assert.equal(milestoneState(90, 240, 240 * 60 * 1000), "closed");
});

test("upload rules reject the wrong type and a huge file", () => {
  process.env.FILE_SIZE_LIMIT_MB = "25";
  assert.equal(checkUpload("notes.exe", "application/octet-stream", 100).ok, false);
  assert.equal(checkUpload("deck.pdf", "application/pdf", 26 * 1024 * 1024).ok, false);
  const ok = checkUpload("deck.pdf", "application/pdf", 1024);
  assert.equal(ok.ok, true);
});
