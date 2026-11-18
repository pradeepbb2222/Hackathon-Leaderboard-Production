import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Track } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { storagePut } from "../lib/storage";
import { judgeScore, progressScore, round1, totalScore } from "../lib/scoring";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20261203);
const pick = <T,>(items: T[]) => items[Math.floor(rnd() * items.length)];

const FIRST = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Ishaan", "Ananya", "Diya", "Aadhya",
  "Anika", "Navya", "Sara", "Meera", "Saanvi", "Rohan", "Kabir", "Dev", "Neel", "Vikram",
  "Sneha", "Pooja", "Lakshmi", "Divya", "Kavya", "Riya", "Tanvi", "Isha", "Farhan", "Zoya",
  "Nikhil", "Karthik", "Sanjay", "Rahul", "Priya", "Deepak", "Amit", "Pavan", "Gaurav", "Shreya",
  "Neha", "Swathi", "Tejas", "Varun", "Aditi", "Nandini", "Siddharth", "Kunal", "Ritika", "Simran",
  "Aman", "Akash", "Vishal", "Kiran", "Pallavi", "Aniket", "Pranav", "Ishita", "Trisha", "Sanjana",
  "Manoj", "Rakesh", "Ajay", "Harini", "Snehal", "Atharv", "Imran", "Fatima", "Omar", "Aisha",
];

const LAST = [
  "Sharma", "Verma", "Gupta", "Patel", "Reddy", "Nair", "Iyer", "Menon", "Kulkarni", "Deshpande",
  "Joshi", "Patil", "Rao", "Singh", "Khan", "Das", "Ghosh", "Banerjee", "Chatterjee", "Mukherjee",
  "Naidu", "Pillai", "Shetty", "Hegde", "Bhat", "Shenoy", "Pawar", "Jadhav", "More", "Kaur",
  "Chopra", "Malhotra", "Kapoor", "Mehta", "Shah", "Bose", "Sen", "Dutta", "Fernandes", "Gowda",
  "Yadav", "Chavan", "Gaikwad", "Qureshi", "Kamat",
];

const COLLEGES = [
  "IIIT Dharwad", "IIT Dharwad", "NITK Surathkal", "RV College of Engineering", "PES University",
  "BMS College of Engineering", "IIIT Hyderabad", "IIT Bombay", "IIT Delhi", "IIT Madras",
  "IIT Kanpur", "IIT Kharagpur", "NIT Trichy", "NIT Warangal", "BITS Pilani", "VIT Vellore",
  "IIIT Bangalore", "COEP Technological University", "VJTI Mumbai", "Jadavpur University",
  "DTU Delhi", "NSUT Delhi", "IIIT Allahabad", "NIT Calicut", "Manipal Institute of Technology",
  "MS Ramaiah Institute of Technology", "KLE Technological University", "SDM College of Engineering",
  "B.V. Bhoomaraddi College", "GIT Belagavi", "UVCE Bengaluru", "SJCE Mysuru", "NIE Mysuru",
  "Amrita Vishwa Vidyapeetham", "SRM Institute", "Thapar Institute", "IIIT Delhi", "IIT Roorkee",
  "IIT Guwahati", "IIT Hyderabad", "NIT Rourkela", "VNIT Nagpur", "Anna University", "PSG College of Technology",
  "SASTRA", "BIT Mesra", "IIEST Shibpur", "ICT Mumbai", "NIT Silchar", "Dayananda Sagar College",
];

const THEMED: Record<Track, string[]> = {
  LEARNING: ["Play Paradox", "Rigor Room", "Curiosity Circuit", "Blackboard Unit", "Lesson Forge", "Quiz Orbit", "Classroom Guild", "Practice Stack", "Socratic Lab", "Recess Protocol", "Chalk Circuit", "Homework Harbor", "Spark Classroom", "Puzzle Period", "Open Recess"],
  REGENERAX: ["Living Grid", "Ward Pulse", "Concrete Canopy", "Drain Intelligence", "Namma Flow", "City Metabolism", "Street Sensor", "Water Commons", "Shade Protocol", "Civic Kiln", "Block Regenerator", "Night Bus Lattice", "Tank Terrain", "Heat Island Unit", "Pipe Works"],
  INSIGHT: ["Inbox Cartographers", "Thread Ledger", "Mailroom Signal", "Decision Trail", "Reply Debt", "Enterprise Ear", "Subject Line", "Follow-up Foundry", "CC Storm", "Conversation Index", "Promise Tracker", "Quiet Inbox", "Escalation Map", "Minutes and Mail", "Accountable Thread"],
  FARMING: ["Khet Gig", "Monsoon Crew", "Acre Exchange", "Harvest Dispatch", "Mandi Link", "Implement Share", "Sowing Roster", "Cold Chain Unit", "Field Wage", "Crop Circuit", "Village Shift", "Tractor Window", "Krishi Dispatch", "Bund Ledger", "Seasonal Squad"],
  SOCIETAL: ["Jan Setu", "Awaaz Stack", "Public Goods Lab", "Clinic Queue", "Access Forge", "Civic Lattice", "Ration Signal", "Helpline Works", "Scholarship Room", "Bus Bay Unit", "Grievance Grid", "Shelter Protocol", "Language Bridge", "Night School", "Last Mile Ledger"],
};

const SUFFIX = ["", " Lab", " Unit", " Collective", " Works", " Guild"];

const NOTES = [
  "Problem is framed around one user and one painful hour of their day.",
  "Architecture is on one page. We are not adding a second product.",
  "Demo path is the happy path plus one failure the jury will ask about.",
  "Data model is small enough to explain without a slide.",
  "We cut a feature so the prototype can actually be clicked.",
];

function person() {
  return `${pick(FIRST)} ${pick(LAST)}`;
}

function membersFor() {
  const count = 2 + Math.floor(rnd() * 3);
  const names = new Set<string>();
  while (names.size < count) names.add(person());
  return [...names].map((name, index) => ({ name, role: index === 0 ? "Lead" : "Builder" }));
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

async function hashAll(passwords: string[]) {
  const out = new Array<string>(passwords.length);
  let cursor = 0;
  async function worker() {
    while (cursor < passwords.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await bcrypt.hash(passwords[index], 10);
    }
  }
  await Promise.all(Array.from({ length: 12 }, () => worker()));
  return out;
}

const PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 420 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 88>>stream
BT /F1 16 Tf 36 120 Td (CodeBharat 2026 Blueprint Lock) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

export async function seedDatabase() {
  if (process.env.SEED_DEMO !== "1") {
    throw new Error("Refusing to load fake squads. Run npm run seed:demo on a rehearsal database only.");
  }
  if ((await prisma.team.count()) > 0) {
    console.log("Squads already exist. Demo seed did not add more and did not delete anything.");
    return;
  }

  const startsAt = new Date(Date.now() - (6 * 60 + 20) * 60 * 1000);
  const activityAt = (minutes: number) => new Date(startsAt.getTime() + minutes * 60 * 1000);

  await prisma.eventState.upsert({
    where: { id: "event" },
    update: { startsAt, feedbackReleased: true, simulationEnabled: false },
    create: {
      id: "event",
      startsAt,
      feedbackReleased: true,
      progressWeight: 40,
      judgeWeight: 60,
      showCountdown: true,
    },
  });

  const milestones = [
    { id: "m1", code: "M1", name: "Problem Understanding & Team Kickoff", summary: "Read the track, name the user, and split the squad. Hour 0 to 1.5.", sortOrder: 1, openOffsetMin: 0, closeOffsetMin: 90, maxPoints: 10, fileRequired: false, requireGithub: false, requireDemo: false },
    { id: "m2", code: "M2", name: "Blueprint Lock", summary: "Architecture, data, and the demo path. This locks at hour 4.", sortOrder: 2, openOffsetMin: 90, closeOffsetMin: 240, maxPoints: 20, fileRequired: true, requireGithub: true, requireDemo: false },
    { id: "m3", code: "M3", name: "Core Build Checkpoint", summary: "The smallest end-to-end slice, running. Closes at hour 10.", sortOrder: 3, openOffsetMin: 240, closeOffsetMin: 600, maxPoints: 25, fileRequired: false, requireGithub: true, requireDemo: false },
    { id: "m4", code: "M4", name: "Feature Complete", summary: "A stranger can use the prototype. Demo link required. Hour 16.", sortOrder: 4, openOffsetMin: 600, closeOffsetMin: 960, maxPoints: 20, fileRequired: false, requireGithub: true, requireDemo: true },
    { id: "m5", code: "M5", name: "Final Submission / Code Freeze", summary: "Repo, live demo, and the deck you will defend. Hour 20.", sortOrder: 5, openOffsetMin: 960, closeOffsetMin: 1200, maxPoints: 25, fileRequired: true, requireGithub: true, requireDemo: true },
  ];
  await prisma.milestone.createMany({
    data: milestones.map((milestone) => ({
      ...milestone,
      requireStatus: true,
      requireProgress: true,
      requireVideo: false,
    })),
    skipDuplicates: true,
  });

  const adminHash = await bcrypt.hash("admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminHash,
      issuedPassword: "admin@123",
      role: "ADMIN",
      displayName: "Ops Control",
      mustChangePassword: false,
    },
  });

  type Spec = {
    id: string;
    code: string;
    name: string;
    track: Track;
    college: string;
    members: { name: string; role: string }[];
    password: string;
    strength: number;
    progress: Record<string, number>;
    late: boolean;
  };

  const quotas: Track[] = [
    ...Array.from({ length: 29 }, () => "REGENERAX" as Track),
    ...Array.from({ length: 30 }, () => "LEARNING" as Track),
    ...Array.from({ length: 30 }, () => "INSIGHT" as Track),
    ...Array.from({ length: 30 }, () => "FARMING" as Track),
    ...Array.from({ length: 30 }, () => "SOCIETAL" as Track),
  ];
  for (let i = quotas.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [quotas[i], quotas[j]] = [quotas[j], quotas[i]];
  }

  const usedNames = new Set<string>(["Concrete Circuit"]);
  const trackCount: Record<string, number> = {};
  const specs: Spec[] = [
    {
      id: crypto.randomUUID(),
      code: "CB26-T001",
      name: "Concrete Circuit",
      track: "REGENERAX",
      college: "IIIT Dharwad",
      members: [
        { name: "Ananya Kulkarni", role: "Lead" },
        { name: "Rohan Deshpande", role: "Builder" },
        { name: "Sneha Patil", role: "Builder" },
        { name: "Aditya Rao", role: "Builder" },
      ],
      password: "team@123",
      strength: 0.9,
      progress: { m1: 100, m2: 100, m3: 100 },
      late: false,
    },
  ];

  quotas.forEach((track, index) => {
    const n = trackCount[track] ?? 0;
    trackCount[track] = n + 1;
    const base = THEMED[track][n % THEMED[track].length];
    const suffix = SUFFIX[Math.floor(n / THEMED[track].length) % SUFFIX.length];
    let name = `${base}${suffix}`.trim();
    if (usedNames.has(name)) name = `${base} ${n + 2}`;
    usedNames.add(name);
    const strength = index / Math.max(1, quotas.length - 1);
    const m1 = strength > 0.08 ? 100 : clamp(50 + rnd() * 50);
    const m2 = strength > 0.3 ? 100 : clamp(strength * 260);
    const rawM3 = strength * 112 - 12;
    const m3 = m2 >= 90 ? clamp(rawM3) : clamp(rawM3 * 0.4);
    specs.push({
      id: crypto.randomUUID(),
      code: `CB26-T${String(index + 2).padStart(3, "0")}`,
      name,
      track,
      college: pick(COLLEGES),
      members: membersFor(),
      password: `Cb${Math.floor(rnd() * 9000 + 1000)}!${pick(LAST).slice(0, 4)}`,
      strength,
      progress: { m1, m2, m3 },
      late: rnd() < 0.06,
    });
  });

  const squadHashes = await hashAll(specs.map((spec) => spec.password));

  await prisma.team.createMany({
    data: specs.map((spec) => ({
      id: spec.id,
      code: spec.code,
      name: spec.name,
      track: spec.track,
      college: spec.college,
      members: JSON.stringify(spec.members),
    })),
  });

  await prisma.user.createMany({
    data: specs.map((spec, index) => ({
      id: crypto.randomUUID(),
      username: spec.code,
      passwordHash: squadHashes[index],
      issuedPassword: spec.password,
      role: "TEAM" as const,
      displayName: spec.name,
      teamId: spec.id,
    })),
  });

  const submissions: {
    id: string;
    teamId: string;
    milestoneId: string;
    statusText: string;
    progress: number;
    githubUrl: string;
    demoUrl: string;
    videoUrl: string;
    isLate: boolean;
    lastActivityAt: Date;
  }[] = [];

  for (const spec of specs) {
    for (const milestoneId of ["m1", "m2", "m3"] as const) {
      const progress = spec.progress[milestoneId] ?? 0;
      if (progress <= 0) continue;
      const minutes = milestoneId === "m1" ? 30 + rnd() * 50 : milestoneId === "m2" ? 140 + rnd() * 90 : 280 + rnd() * 90;
      submissions.push({
        id: crypto.randomUUID(),
        teamId: spec.id,
        milestoneId,
        statusText: spec.code === "CB26-T001"
          ? milestoneId === "m3"
            ? "Ward water loop runs from sensor event to a crew ticket. Demo path is stable."
            : "Blueprint is locked: edge rules on the ward node, one city API, no second app."
          : pick(NOTES),
        progress,
        githubUrl: `https://github.com/codebharat-demo/${spec.code.toLowerCase()}`,
        demoUrl: progress >= 70 && milestoneId === "m3" ? `https://example.com/demo/${spec.code.toLowerCase()}` : "",
        videoUrl: "",
        isLate: spec.late && milestoneId === "m2",
        lastActivityAt: activityAt(minutes),
      });
    }
  }

  await prisma.submission.createMany({ data: submissions });
  await prisma.submissionRevision.createMany({
    data: submissions.map((submission) => ({
      id: crypto.randomUUID(),
      submissionId: submission.id,
      statusText: submission.statusText,
      progress: submission.progress,
      githubUrl: submission.githubUrl,
      demoUrl: submission.demoUrl,
      videoUrl: "",
      isLate: submission.isLate,
      actorName: submission.teamId === specs[0].id ? "Ananya Kulkarni" : "Squad lead",
      createdAt: submission.lastActivityAt,
    })),
  });

  const t1m1 = submissions.find((item) => item.teamId === specs[0].id && item.milestoneId === "m1");
  const t1m2 = submissions.find((item) => item.teamId === specs[0].id && item.milestoneId === "m2");
  const t1m3 = submissions.find((item) => item.teamId === specs[0].id && item.milestoneId === "m3");
  if (t1m1 && t1m2 && t1m3) {
    await prisma.submissionRevision.createMany({
      data: [
        { submissionId: t1m1.id, statusText: "Reading the ward brief and naming the crew.", progress: 35, githubUrl: "", demoUrl: "", videoUrl: "", isLate: false, actorName: "Ananya Kulkarni", createdAt: activityAt(25) },
        { submissionId: t1m2.id, statusText: "Drafting schema boundaries before blueprint lock.", progress: 60, githubUrl: t1m2.githubUrl, demoUrl: "", videoUrl: "", isLate: false, actorName: "Rohan Deshpande", createdAt: activityAt(160) },
        { submissionId: t1m3.id, statusText: "Sensor event reaches the ticket, UI still thin.", progress: 40, githubUrl: t1m3.githubUrl, demoUrl: "", videoUrl: "", isLate: false, actorName: "Sneha Patil", createdAt: activityAt(320) },
      ],
    });
    const storedName = `${specs[0].id}/m2/${crypto.randomBytes(16).toString("hex")}.pdf`;
    await storagePut(storedName, Buffer.from(PDF), "application/pdf");
    await prisma.submissionFile.create({
      data: {
        submissionId: t1m2.id,
        originalName: "Concrete-Circuit-blueprint.pdf",
        storedName,
        mimeType: "application/pdf",
        sizeBytes: Buffer.byteLength(PDF),
        confirmed: true,
        uploadedAt: activityAt(210),
      },
    });
  }

  const judgeSpecs = [
    { username: "judge01", password: "judge@123", name: "Anika Shenoy", title: "Lead Jury · SASA Engineers" },
    { username: "judge02", password: `Jy${Math.floor(rnd() * 9000 + 1000)}!Kulk`, name: "Raghavendra Kulkarni", title: "Faculty Jury · IIIT Dharwad" },
    { username: "judge03", password: `Jy${Math.floor(rnd() * 9000 + 1000)}!Iyer`, name: "Meera Iyer", title: "Civic Systems · Savishkar India" },
    { username: "judge04", password: `Jy${Math.floor(rnd() * 9000 + 1000)}!Rao`, name: "Arvind Rao", title: "Industry Jury · Infrastructure" },
    { username: "judge05", password: `Jy${Math.floor(rnd() * 9000 + 1000)}!Khan`, name: "Fatima Khan", title: "Product Jury" },
    { username: "judge06", password: `Jy${Math.floor(rnd() * 9000 + 1000)}!Meno`, name: "Karthik Menon", title: "Engineering Craft" },
    { username: "judge07", password: `Jy${Math.floor(rnd() * 9000 + 1000)}!Pati`, name: "Sneha Patil", title: "Impact Jury" },
    { username: "judge08", password: `Jy${Math.floor(rnd() * 9000 + 1000)}!Desh`, name: "Vikram Deshpande", title: "Prototype Jury" },
    { username: "judge09", password: `Jy${Math.floor(rnd() * 9000 + 1000)}!Redd`, name: "Ananya Reddy", title: "Stage & Defense" },
    { username: "judge10", password: `Jy${Math.floor(rnd() * 9000 + 1000)}!Qure`, name: "Imran Qureshi", title: "Guest Jury · Public Goods" },
  ];
  const judgeHashes = await hashAll(judgeSpecs.map((judge) => judge.password));
  const judgeIds = judgeSpecs.map(() => crypto.randomUUID());
  const judgeUserIds = judgeSpecs.map(() => crypto.randomUUID());
  await prisma.user.createMany({
    data: judgeSpecs.map((judge, index) => ({
      id: judgeUserIds[index],
      username: judge.username,
      passwordHash: judgeHashes[index],
      issuedPassword: judge.password,
      role: "JUDGE" as const,
      displayName: judge.name,
    })),
  });
  await prisma.judge.createMany({
    data: judgeSpecs.map((judge, index) => ({
      id: judgeIds[index],
      userId: judgeUserIds[index],
      title: judge.title,
    })),
  });

  const ranges: Array<[number, number]> = [
    [0, 18],
    [12, 36],
    [30, 55],
    [48, 74],
    [66, 92],
    [84, 110],
    [102, 128],
    [120, 146],
    [132, 150],
    [0, 150],
  ];

  const assignments: { id: string; judgeId: string; teamId: string }[] = [];
  const scores: {
    id: string;
    judgeId: string;
    teamId: string;
    engineering: number;
    impact: number;
    prototype: number;
    vision: number;
    engineeringNote: string;
    impactNote: string;
    prototypeNote: string;
    visionNote: string;
    overallComment: string;
    status: "DRAFT" | "SUBMITTED";
    submittedAt: Date | null;
  }[] = [];

  specs.forEach((spec, teamIndex) => {
    ranges.forEach((range, judgeIndex) => {
      const [start, end] = range;
      const inRange = judgeIndex === 9 ? teamIndex % 5 === 0 : teamIndex >= start && teamIndex < end;
      if (!inRange) return;
      if (spec.code === "CB26-T001" && judgeSpecs[judgeIndex].username !== "judge01") return;
      assignments.push({ id: crypto.randomUUID(), judgeId: judgeIds[judgeIndex], teamId: spec.id });
      if (spec.code === "CB26-T001") {
        scores.push({
          id: crypto.randomUUID(),
          judgeId: judgeIds[judgeIndex],
          teamId: spec.id,
          engineering: 9,
          impact: 9,
          prototype: 8,
          vision: 9,
          engineeringNote: "Schema and service boundaries are clear. Tighten the failure path when a ward sensor drops.",
          impactNote: "The ward water-and-waste loop is concrete. It is not a generic smart-city slogan.",
          prototypeNote: "Blueprint is locked and the core slice moves. Keep the demo path honest.",
          visionNote: "They can defend edge rules versus a city API. That will hold on stage.",
          overallComment: "A real RegeneraX attempt. Protect the demo path before adding surface area.",
          status: "SUBMITTED",
          submittedAt: activityAt(360),
        });
        return;
      }
      const roll = rnd();
      if (roll > 0.72) return;
      const base = Math.round(4 + spec.strength * 5.6 + (rnd() - 0.5) * 1.4);
      const wobble = () => Math.max(0, Math.min(10, base + Math.round((rnd() - 0.5) * 2)));
      const status = roll < 0.55 ? "SUBMITTED" : "DRAFT";
      scores.push({
        id: crypto.randomUUID(),
        judgeId: judgeIds[judgeIndex],
        teamId: spec.id,
        engineering: wobble(),
        impact: wobble(),
        prototype: wobble(),
        vision: wobble(),
        engineeringNote: status === "SUBMITTED" ? "Structure is readable. Name the one constraint you refused to ignore." : "",
        impactNote: status === "SUBMITTED" ? "The user is specific. Push the consequence, not the feature list." : "",
        prototypeNote: status === "SUBMITTED" ? "Show the working path before the slides." : "",
        visionNote: "",
        overallComment: status === "SUBMITTED" ? "Usable direction. Hold the scope." : "",
        status,
        submittedAt: status === "SUBMITTED" ? activityAt(300 + rnd() * 70) : null,
      });
    });
  });

  await prisma.judgeAssignment.createMany({ data: assignments });
  await prisma.judgeScore.createMany({ data: scores });

  const milestonePoints = milestones.map((milestone) => ({ id: milestone.id, maxPoints: milestone.maxPoints }));
  const scored = specs.map((spec) => {
    const subs = ["m1", "m2", "m3"].map((id) => ({ milestoneId: id, progress: spec.progress[id] ?? 0 }));
    const progress = progressScore(subs, milestonePoints);
    const mine = scores.filter((score) => score.teamId === spec.id);
    const judged = judgeScore(mine);
    return { spec, total: totalScore(progress, judged, 40, 60) };
  });
  scored.sort((a, b) => b.total - a.total || a.spec.code.localeCompare(b.spec.code));
  await prisma.rankMemory.createMany({
    data: scored.map((row, index) => {
      const rank = index + 1;
      const delta = row.spec.code === "CB26-T001" ? 5 : Math.round((rnd() - 0.42) * 5);
      return {
        teamId: row.spec.id,
        publishedRank: rank,
        previousRank: Math.max(1, Math.min(specs.length, rank + delta)),
      };
    }),
  });

  await prisma.announcement.createMany({
    data: [
      {
        title: "Welcome to IIIT Dharwad",
        body: "Phase 01 is for architecture. Blueprint Lock is at hour 4. There is no mentor program — the build is yours.",
        authorId: admin.id,
        createdAt: activityAt(15),
      },
      {
        title: "Overnight floor",
        body: "Power, water, and rest space are at Innovation Commons. Marshals are on the floor if a desk bay fails.",
        authorId: admin.id,
        createdAt: activityAt(180),
      },
      {
        title: "M3 is open",
        body: "Core Build Checkpoint is live. Push a working slice, not another slide. Code freeze is hour 20.",
        authorId: admin.id,
        createdAt: activityAt(250),
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { actorId: admin.id, actorName: "Ops Control", action: "event.kickoff", entityType: "event", entityId: "event", detail: "Sprint clock started for the floor rehearsal.", createdAt: activityAt(0) },
      { actorId: admin.id, actorName: "Ops Control", action: "teams.import", entityType: "team", detail: "150 squads issued credentials.", createdAt: activityAt(5) },
      { actorId: admin.id, actorName: "Ops Control", action: "judges.assign", entityType: "judge", detail: "Jury packets assigned across five tracks.", createdAt: activityAt(20) },
      { actorId: admin.id, actorName: "Ops Control", action: "feedback.release", entityType: "event", detail: "Submitted jury notes are visible to squads.", createdAt: activityAt(340) },
    ],
  });

  const top = scored[0];
  console.log(
    `Seeded ${specs.length} squads, ${judgeSpecs.length} judges. Leader ${top.spec.code} ${top.spec.name} at ${round1(top.total)}.`,
  );
}

const entry = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (entry.includes("seed-demo") || entry.includes("/prisma/seed.ts")) {
  seedDatabase()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
