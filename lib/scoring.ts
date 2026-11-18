import type { CriterionKey } from "@/lib/tracks";

export type MilestonePoints = { id: string; maxPoints: number };
export type ProgressInput = { milestoneId: string; progress: number };
export type JudgeInput = {
  status: "DRAFT" | "SUBMITTED";
  engineering: number;
  impact: number;
  prototype: number;
  vision: number;
};

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function progressScore(subs: ProgressInput[], milestones: MilestonePoints[]) {
  const totalMax = milestones.reduce((sum, milestone) => sum + milestone.maxPoints, 0) || 1;
  let earned = 0;
  for (const milestone of milestones) {
    const found = subs.find((item) => item.milestoneId === milestone.id);
    earned += (clamp(found?.progress ?? 0, 0, 100) / 100) * milestone.maxPoints;
  }
  return (earned / totalMax) * 100;
}

export function judgeAverage(score: Pick<JudgeInput, CriterionKey>) {
  return (score.engineering + score.impact + score.prototype + score.vision) / 4;
}

export function judgeScore(scores: JudgeInput[]) {
  const submitted = scores.filter((score) => score.status === "SUBMITTED");
  if (!submitted.length) return null;
  const mean = submitted.reduce((sum, score) => sum + judgeAverage(score), 0) / submitted.length;
  return mean * 10;
}

export function totalScore(progress: number, judge: number | null, progressWeight: number, judgeWeight: number) {
  const pw = Math.max(0, progressWeight);
  const jw = Math.max(0, judgeWeight);
  const denom = pw + jw || 1;
  return (progress * pw + (judge ?? 0) * jw) / denom;
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}
