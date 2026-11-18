import bcrypt from "bcryptjs";
import { getBranding } from "../lib/branding";
import { prisma } from "../lib/prisma";

const MILESTONES = [
  { id: "m1", code: "M1", name: "Problem Understanding & Team Kickoff", summary: "Read the track, name the user, and split the squad. Hour 0 to 1.5.", sortOrder: 1, openOffsetMin: 0, closeOffsetMin: 90, maxPoints: 10, fileRequired: false, requireGithub: false, requireDemo: false, requireVideo: false },
  { id: "m2", code: "M2", name: "Blueprint Lock", summary: "Architecture, data, and the demo path. This locks at hour 4.", sortOrder: 2, openOffsetMin: 90, closeOffsetMin: 240, maxPoints: 20, fileRequired: true, requireGithub: true, requireDemo: false, requireVideo: false },
  { id: "m3", code: "M3", name: "Core Build Checkpoint", summary: "The smallest end-to-end slice, running. Closes at hour 10.", sortOrder: 3, openOffsetMin: 240, closeOffsetMin: 600, maxPoints: 25, fileRequired: false, requireGithub: true, requireDemo: false, requireVideo: false },
  { id: "m4", code: "M4", name: "Feature Complete", summary: "A stranger can use the prototype. Demo link required. Hour 16.", sortOrder: 4, openOffsetMin: 600, closeOffsetMin: 960, maxPoints: 20, fileRequired: false, requireGithub: true, requireDemo: true, requireVideo: false },
  { id: "m5", code: "M5", name: "Final Submission / Code Freeze", summary: "Repo, live demo, and the deck you will defend. Hour 20.", sortOrder: 5, openOffsetMin: 960, closeOffsetMin: 1200, maxPoints: 25, fileRequired: true, requireGithub: true, requireDemo: true, requireVideo: false },
];

export async function seedProduction() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("Set ADMIN_PASSWORD to at least 8 characters before the production seed.");
  }
  const brand = getBranding();
  const existing = await prisma.user.findUnique({ where: { username } });
  if (!existing) {
    await prisma.user.create({
      data: {
        username,
        passwordHash: await bcrypt.hash(password, 10),
        issuedPassword: password,
        role: "ADMIN",
        displayName: "Ops Control",
        mustChangePassword: true,
      },
    });
    console.log(`Created organizer login ${username}. They must change the password at first sign-in.`);
  } else {
    console.log(`Organizer ${username} already exists. Password was left unchanged.`);
  }

  await prisma.eventState.upsert({
    where: { id: "event" },
    update: {},
    create: {
      id: "event",
      name: brand.name,
      edition: brand.edition,
      venue: brand.venue,
      theme: brand.theme,
      datesLabel: brand.dates,
      logoUrl: brand.logoUrl,
      startsAt: new Date("2026-12-03T03:30:00.000Z"),
      simulationEnabled: false,
      progressWeight: 40,
      judgeWeight: 60,
      showCountdown: true,
    },
  });

  for (const milestone of MILESTONES) {
    await prisma.milestone.upsert({
      where: { id: milestone.id },
      update: {},
      create: { ...milestone, requireStatus: true, requireProgress: true },
    });
  }
  console.log("Event, five tracks, and five gates are ready. Demo simulation is off.");
}

const entry = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (entry.includes("seed-production")) {
  seedProduction()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
