import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseCsv, pickField } from "@/lib/csv";
import { HttpError, api, json } from "@/lib/http";
import { publishBoard } from "@/lib/live";
import { createSquad } from "@/lib/squads";

export const POST = api(async (req) => {
  const admin = await requireUser(req, ["ADMIN"]);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Attach a CSV file.");
  if (file.size > 2 * 1024 * 1024) throw new HttpError(400, "CSV must be under 2 MB.");
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) throw new HttpError(400, "That CSV has no rows.");
  const created: { code: string; name: string; username: string; password: string }[] = [];
  const errors: { row: number; message: string }[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const record = rows[index];
    try {
      const result = await createSquad({
        name: pickField(record, ["team_name", "name", "squad", "squad_name"]),
        track: pickField(record, ["track", "problem", "challenge"]),
        college: pickField(record, ["college", "institution", "campus"]),
        members: pickField(record, ["members", "member_names", "squad_members"]),
        password: pickField(record, ["password"]) || undefined,
      });
      created.push({
        code: result.username,
        name: result.team.name,
        username: result.username,
        password: result.password,
      });
    } catch (error) {
      errors.push({ row: index + 2, message: error instanceof Error ? error.message : "Could not import row." });
    }
  }
  await audit(admin, "teams.import", "team", null, { created: created.length, errors: errors.length });
  if (created.length) await publishBoard();
  return json({ created, errors });
});
