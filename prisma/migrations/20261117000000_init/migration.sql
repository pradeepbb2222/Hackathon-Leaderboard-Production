-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEAM', 'JUDGE');

-- CreateEnum
CREATE TYPE "Track" AS ENUM ('LEARNING', 'REGENERAX', 'INSIGHT', 'FARMING', 'SOCIETAL');

-- CreateEnum
CREATE TYPE "ScoreStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "issuedPassword" TEXT,
    "role" "Role" NOT NULL,
    "displayName" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "track" "Track" NOT NULL,
    "college" TEXT NOT NULL,
    "members" TEXT NOT NULL,
    "isFinalist" BOOLEAN NOT NULL DEFAULT false,
    "quotaMb" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Judge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Jury',

    CONSTRAINT "Judge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgeAssignment" (
    "id" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "openOffsetMin" INTEGER NOT NULL,
    "closeOffsetMin" INTEGER NOT NULL,
    "maxPoints" INTEGER NOT NULL,
    "fileRequired" BOOLEAN NOT NULL DEFAULT false,
    "requireStatus" BOOLEAN NOT NULL DEFAULT true,
    "requireProgress" BOOLEAN NOT NULL DEFAULT true,
    "requireGithub" BOOLEAN NOT NULL DEFAULT false,
    "requireDemo" BOOLEAN NOT NULL DEFAULT false,
    "requireVideo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "statusText" TEXT NOT NULL DEFAULT '',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "githubUrl" TEXT NOT NULL DEFAULT '',
    "demoUrl" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT NOT NULL DEFAULT '',
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionRevision" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "statusText" TEXT NOT NULL,
    "progress" INTEGER NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "demoUrl" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "isLate" BOOLEAN NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionFile" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "tokenHash" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgeScore" (
    "id" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "engineering" INTEGER NOT NULL DEFAULT 0,
    "impact" INTEGER NOT NULL DEFAULT 0,
    "prototype" INTEGER NOT NULL DEFAULT 0,
    "vision" INTEGER NOT NULL DEFAULT 0,
    "engineeringNote" TEXT NOT NULL DEFAULT '',
    "impactNote" TEXT NOT NULL DEFAULT '',
    "prototypeNote" TEXT NOT NULL DEFAULT '',
    "visionNote" TEXT NOT NULL DEFAULT '',
    "overallComment" TEXT NOT NULL DEFAULT '',
    "status" "ScoreStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgeScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventState" (
    "id" TEXT NOT NULL DEFAULT 'event',
    "name" TEXT NOT NULL DEFAULT 'CodeBharat 2026',
    "edition" TEXT NOT NULL DEFAULT '2nd Edition',
    "venue" TEXT NOT NULL DEFAULT 'IIIT Dharwad',
    "theme" TEXT NOT NULL DEFAULT 'From Code to Concrete Innovation',
    "datesLabel" TEXT NOT NULL DEFAULT '3–4 December 2026',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "pausedAt" TIMESTAMP(3),
    "accumulatedPauseMs" INTEGER NOT NULL DEFAULT 0,
    "showCountdown" BOOLEAN NOT NULL DEFAULT true,
    "submissionsLocked" BOOLEAN NOT NULL DEFAULT false,
    "leaderboardHidden" BOOLEAN NOT NULL DEFAULT false,
    "leaderboardFrozen" BOOLEAN NOT NULL DEFAULT false,
    "feedbackReleased" BOOLEAN NOT NULL DEFAULT false,
    "progressWeight" INTEGER NOT NULL DEFAULT 40,
    "judgeWeight" INTEGER NOT NULL DEFAULT 60,
    "simulationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "frozenSnapshot" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankMemory" (
    "teamId" TEXT NOT NULL,
    "previousRank" INTEGER NOT NULL,
    "publishedRank" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankMemory_pkey" PRIMARY KEY ("teamId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_teamId_key" ON "User"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Team_code_key" ON "Team"("code");

-- CreateIndex
CREATE INDEX "Team_track_idx" ON "Team"("track");

-- CreateIndex
CREATE INDEX "Team_isFinalist_idx" ON "Team"("isFinalist");

-- CreateIndex
CREATE UNIQUE INDEX "Judge_userId_key" ON "Judge"("userId");

-- CreateIndex
CREATE INDEX "JudgeAssignment_teamId_idx" ON "JudgeAssignment"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeAssignment_judgeId_teamId_key" ON "JudgeAssignment"("judgeId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_code_key" ON "Milestone"("code");

-- CreateIndex
CREATE INDEX "Submission_teamId_idx" ON "Submission"("teamId");

-- CreateIndex
CREATE INDEX "Submission_milestoneId_idx" ON "Submission"("milestoneId");

-- CreateIndex
CREATE INDEX "Submission_lastActivityAt_idx" ON "Submission"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Submission_progress_lastActivityAt_idx" ON "Submission"("progress", "lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_teamId_milestoneId_key" ON "Submission"("teamId", "milestoneId");

-- CreateIndex
CREATE INDEX "SubmissionRevision_submissionId_createdAt_idx" ON "SubmissionRevision"("submissionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionFile_storedName_key" ON "SubmissionFile"("storedName");

-- CreateIndex
CREATE INDEX "SubmissionFile_submissionId_confirmed_idx" ON "SubmissionFile"("submissionId", "confirmed");

-- CreateIndex
CREATE INDEX "SubmissionFile_tokenHash_idx" ON "SubmissionFile"("tokenHash");

-- CreateIndex
CREATE INDEX "JudgeScore_teamId_status_idx" ON "JudgeScore"("teamId", "status");

-- CreateIndex
CREATE INDEX "JudgeScore_judgeId_status_idx" ON "JudgeScore"("judgeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeScore_judgeId_teamId_key" ON "JudgeScore"("judgeId", "teamId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Judge" ADD CONSTRAINT "Judge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeAssignment" ADD CONSTRAINT "JudgeAssignment_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "Judge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeAssignment" ADD CONSTRAINT "JudgeAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionRevision" ADD CONSTRAINT "SubmissionRevision_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionFile" ADD CONSTRAINT "SubmissionFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeScore" ADD CONSTRAINT "JudgeScore_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "Judge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeScore" ADD CONSTRAINT "JudgeScore_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

