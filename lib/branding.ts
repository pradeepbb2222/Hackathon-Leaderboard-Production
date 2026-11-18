import { getEnv } from "@/lib/env";

export type Branding = {
  name: string;
  edition: string;
  venue: string;
  dates: string;
  theme: string;
  logoUrl: string;
  demoHints: boolean;
};

const FALLBACK: Branding = {
  name: "CodeBharat 2026",
  edition: "2nd Edition",
  venue: "IIIT Dharwad",
  dates: "3–4 December 2026",
  theme: "From Code to Concrete Innovation",
  logoUrl: "",
  demoHints: false,
};

export function getBranding(): Branding {
  try {
    return readBranding();
  } catch (error) {
    if (process.env.NEXT_PHASE === "phase-production-build") return FALLBACK;
    throw error;
  }
}

function readBranding(): Branding {
  const env = getEnv();
  return {
    name: env.EVENT_NAME,
    edition: env.EVENT_EDITION,
    venue: env.EVENT_VENUE,
    dates: env.EVENT_DATES,
    theme: env.EVENT_THEME,
    logoUrl: env.EVENT_LOGO_URL,
    demoHints: env.DEMO_HINTS === "true",
  };
}
