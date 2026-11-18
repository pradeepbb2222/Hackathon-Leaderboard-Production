import type { Track } from "@prisma/client";
import { HttpError } from "@/lib/http";
import { hashPassword, generatePassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { nextTeamCode, parseMembers } from "@/lib/team-code";
import { trackFromLabel, type TrackId } from "@/lib/tracks";

export async function createSquad(input: {
  name: string;
  track: string;
  college: string;
  members: string;
  password?: string;
}) {
  const name = input.name.trim();
  const college = input.college.trim();
  if (name.length < 2 || name.length > 60) throw new HttpError(400, "Squad name should be 2–60 characters.");
  if (college.length < 2 || college.length > 80) throw new HttpError(400, "College name should be 2–80 characters.");
  const track = trackFromLabel(input.track);
  if (!track) throw new HttpError(400, "Track was not recognized. Use one of the five CodeBharat tracks.");
  let members;
  try {
    members = parseMembers(input.members);
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "Check the member list.");
  }
  const password = input.password?.trim() || generatePassword();
  if (password.length < 8 || password.length > 80) {
    throw new HttpError(400, "Password must be at least 8 characters.");
  }
  const code = await nextTeamCode();
  const passwordHash = await hashPassword(password);
  const team = await prisma.team.create({
    data: {
      code,
      name,
      college,
      track: track as Track,
      members: JSON.stringify(members),
      user: {
        create: {
          username: code,
          passwordHash,
          issuedPassword: password,
          role: "TEAM",
          displayName: name,
        },
      },
    },
  });
  return { team, password, username: code, track: track as TrackId };
}

export async function resetUserPassword(userId: string) {
  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, issuedPassword: password },
  });
  await prisma.session.deleteMany({ where: { userId } });
  return password;
}
