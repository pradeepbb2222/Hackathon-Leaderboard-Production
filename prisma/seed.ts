import { seedProduction } from "./seed-production";
import { prisma } from "../lib/prisma";

const entry = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (entry.endsWith("/prisma/seed.ts") || entry.endsWith("\\prisma\\seed.ts")) {
  seedProduction()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
