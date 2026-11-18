import { prisma } from "@/lib/prisma";

export async function nextTeamCode() {
  const teams = await prisma.team.findMany({ select: { code: true } });
  let max = 0;
  for (const team of teams) {
    const match = team.code.match(/(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `CB26-T${String(max + 1).padStart(3, "0")}`;
}

export function parseMembers(raw: string) {
  const names = raw
    .split(/\n|;|\|/)
    .flatMap((part) => (part.includes(",") && !part.includes(" ") ? part.split(",") : [part]))
    .map((name) => name.trim())
    .filter(Boolean);
  const unique = [...new Set(names)];
  if (unique.length < 2 || unique.length > 4) {
    throw new Error("Each squad needs 2 to 4 members, one name per line.");
  }
  return unique.map((name, index) => ({
    name: name.slice(0, 80),
    role: index === 0 ? "Lead" : "Builder",
  }));
}
