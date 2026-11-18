import { requireUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { api } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = api(async (req) => {
  await requireUser(req, ["ADMIN"]);
  const judges = await prisma.judge.findMany({ include: { user: true }, orderBy: { user: { username: "asc" } } });
  const csv = toCsv(
    ["username", "name", "title", "password"],
    judges.map((judge) => [judge.user.username, judge.user.displayName, judge.title, judge.user.issuedPassword ?? ""]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=codebharat-2026-jury.csv",
      "Cache-Control": "no-store",
    },
  });
});
