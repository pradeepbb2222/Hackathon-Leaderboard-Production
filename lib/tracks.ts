export const TRACKS = [
  {
    id: "LEARNING",
    code: "TRK-01",
    short: "Learning",
    name: "The Playful Paradox of Learning",
    line: "Play that does not drop the rigor.",
  },
  {
    id: "REGENERAX",
    code: "TRK-02",
    short: "RegeneraX",
    name: "RegeneraX — The Intelligence of Living Cities",
    line: "Cities that sense, adapt, and regenerate.",
  },
  {
    id: "INSIGHT",
    code: "TRK-03",
    short: "Insight Mail",
    name: "Insight Mail – The Language of Enterprise Conversations",
    line: "The mail trail, turned into decisions.",
  },
  {
    id: "FARMING",
    code: "TRK-04",
    short: "Farming",
    name: "Gigifying Farming",
    line: "Farm work, found and paid like a fair gig.",
  },
  {
    id: "SOCIETAL",
    code: "TRK-05",
    short: "Societal",
    name: "Tech for Societal Impact",
    line: "A working tool with a public beneficiary.",
  },
] as const;

export type TrackId = (typeof TRACKS)[number]["id"];

export function trackById(id: string) {
  return TRACKS.find((track) => track.id === id) ?? TRACKS[0];
}

export function trackFromLabel(raw: string): TrackId | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  const hit = TRACKS.find((track) => {
    const bag = `${track.id} ${track.short} ${track.name} ${track.code}`.toLowerCase();
    return bag.includes(value) || value.includes(track.short.toLowerCase()) || value.includes(track.id.toLowerCase());
  });
  if (hit) return hit.id;
  if (value.includes("play") || value.includes("learn")) return "LEARNING";
  if (value.includes("regen") || value.includes("cit")) return "REGENERAX";
  if (value.includes("mail") || value.includes("insight")) return "INSIGHT";
  if (value.includes("farm") || value.includes("gig")) return "FARMING";
  if (value.includes("societ") || value.includes("impact") || value.includes("civic")) return "SOCIETAL";
  return null;
}

export const CRITERIA = [
  { key: "engineering", label: "Engineering Craft", hint: "Architecture, code quality, and how constraints were handled." },
  { key: "impact", label: "Real-World Impact", hint: "A real civic, campus, or industry need — not a generic demo." },
  { key: "prototype", label: "Functional Prototype", hint: "An end-to-end slice that actually runs." },
  { key: "vision", label: "Stage Vision & Defense", hint: "Can they defend the trade-offs on the grand stage?" },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];

export const SPRINT_MINUTES = 20 * 60;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_FILES_PER_MILESTONE = 8;
