const base = process.env.BASE || "http://127.0.0.1:4317";

function jar() {
  const cookies = new Map();
  return {
    headers(extra = {}) {
      const cookie = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
      return { ...(cookie ? { cookie } : {}), ...extra };
    },
    take(res) {
      const raw = res.headers.getSetCookie?.() || [];
      for (const line of raw) {
        const [pair] = line.split(";");
        const idx = pair.indexOf("=");
        if (idx > 0) cookies.set(pair.slice(0, idx), pair.slice(idx + 1));
      }
    },
  };
}

async function login(username, password) {
  const box = jar();
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  box.take(res);
  const body = await res.json();
  if (!res.ok) throw new Error(`login ${username} failed: ${JSON.stringify(body)}`);
  return { box, body };
}

async function get(box, path) {
  const res = await fetch(`${base}${path}`, { headers: box.headers() });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, headers: res.headers };
}

async function send(box, path, method, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: box.headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const failures = [];
function check(name, ok, detail = "") {
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
  console.log(`${ok ? "ok" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const health = await fetch(`${base}/api/health`).then((r) => r.json());
check("health", health.ok && health.teams === 150, JSON.stringify(health));

const board = await fetch(`${base}/api/live/board`).then((r) => r.json());
check("public board has 150", board.rows?.length === 150, `rows=${board.rows?.length}`);
const t001 = board.rows.find((row) => row.code === "CB26-T001");
check("demo squad is on the board", Boolean(t001), t001 ? `rank ${t001.rank}` : "missing");
check("public rows hide internal ids", !("teamId" in (board.rows[0] || {})));

const admin = await login("admin", "admin@123");
check("admin login", admin.body.role === "ADMIN");
const overview = await get(admin.box, "/api/admin/overview");
check("admin overview", overview.status === 200 && overview.json.teams === 150);

const team = await login("CB26-T001", "team@123");
check("team login", team.body.redirect === "/team");
const dash = await get(team.box, "/api/team/dashboard");
check("team dashboard", dash.status === 200 && dash.json.team.code === "CB26-T001");
check("team sees own feedback", Array.isArray(dash.json.feedback) && dash.json.feedback.length > 0, `notes=${dash.json.feedback?.length}`);

const save = await send(team.box, "/api/team/milestones/m3", "PUT", {
  statusText: "Ward loop demo path verified on the floor just now.",
  progress: 100,
  githubUrl: "https://github.com/codebharat-demo/cb26-t001",
  demoUrl: "https://example.com/demo/cb26-t001",
  videoUrl: "",
});
check("team saves milestone", save.status === 200, JSON.stringify(save.json));

const pdf = new Blob([`%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n`], { type: "application/pdf" });
const form = new FormData();
form.set("file", new File([pdf], "floor-check.pdf", { type: "application/pdf" }));
const upload = await fetch(`${base}/api/team/milestones/m3/files`, { method: "POST", headers: team.box.headers(), body: form });
const uploadJson = await upload.json();
check("team uploads file", upload.status === 200, JSON.stringify(uploadJson));

const ownFile = await get(team.box, `/api/team/files/${uploadJson.file.id}`);
check("team downloads own file", ownFile.status === 200 && ownFile.headers.get("content-type")?.includes("pdf"));

const adminTeams = await get(admin.box, "/api/admin/teams");
const other = adminTeams.json.teams.find((item) => item.code === "CB26-T002");
const t001FileId = uploadJson.file.id;
const intruder = await login(other.username, other.password);
const stolen = await get(intruder.box, `/api/team/files/${t001FileId}`);
check("other squad cannot download this file", stolen.status === 404, `status ${stolen.status}`);
const blueprint = dash.json.milestones.find((item) => item.id === "m2")?.submission?.files?.[0];
if (blueprint) {
  const cross = await get(intruder.box, `/api/team/files/${blueprint.id}`);
  check("T002 cannot fetch T001 blueprint", cross.status === 404, `status ${cross.status}`);
}

const otherDash = await get(team.box, "/api/team/dashboard");
check("team still only sees itself", otherDash.json.team.code === "CB26-T001");
const adminAsTeam = await get(team.box, "/api/admin/overview");
check("squad cannot open organizer API", adminAsTeam.status === 403, `status ${adminAsTeam.status}`);
const adminFileAsTeam = await get(team.box, `/api/admin/files/${t001FileId}`);
check("squad cannot use organizer file route", adminFileAsTeam.status === 403, `status ${adminFileAsTeam.status}`);

const judge = await login("judge01", "judge@123");
const packet = await get(judge.box, "/api/judge/teams");
check("judge sees an assigned packet", packet.status === 200 && packet.json.teams.length > 0 && packet.json.teams.length < 150, `count=${packet.json.teams?.length}`);
const assigned = packet.json.teams.find((item) => item.code === "CB26-T001");
check("judge01 has Concrete Circuit", Boolean(assigned));
const before = board.rows.find((row) => row.code === "CB26-T001");
const scored = await send(judge.box, `/api/judge/teams/${assigned.id}/score`, "PUT", {
  engineering: 10, impact: 9, prototype: 9, vision: 10,
  engineeringNote: "Verified live.",
  impactNote: "Still concrete.",
  prototypeNote: "Demo path holds.",
  visionNote: "Ready for the stage.",
  overallComment: "Score updated during floor check.",
  submit: true,
});
check("judge submits score", scored.status === 200, JSON.stringify(scored.json));
const judgeView = await get(judge.box, `/api/judge/teams/${assigned.id}`);
check("judge payload has no other jurors", judgeView.status === 200 && !JSON.stringify(judgeView.json).includes("Raghavendra"));
const after = await fetch(`${base}/api/live/board`).then((r) => r.json());
const afterRow = after.rows.find((row) => row.code === "CB26-T001");
check("leaderboard carries the submitted jury mark", afterRow?.judgeScore === 95, `score ${afterRow?.judgeScore}`);
void before;

const stream = await fetch(`${base}/api/live/stream`, { headers: { accept: "text/event-stream" } });
const reader = stream.body.getReader();
const chunk = await reader.read();
reader.cancel();
const text = new TextDecoder().decode(chunk.value);
check("sse sends a board", text.includes("CB26-T001") && text.startsWith("data:"));

const late = await send(team.box, "/api/team/milestones/m2", "PUT", {
  statusText: "Blueprint still holds. This note landed after the lock.",
  progress: 100,
  githubUrl: "https://github.com/codebharat-demo/cb26-t001",
  demoUrl: "",
  videoUrl: "",
});
check("closed gate is saved and flagged late", late.status === 200 && late.json.isLate === true, JSON.stringify(late.json));

await send(admin.box, "/api/admin/event", "PATCH", { preset: "hour2" });
const early = await send(team.box, "/api/team/milestones/m4", "PUT", {
  statusText: "This gate is not open in hour 2.",
  progress: 10,
  githubUrl: "https://github.com/codebharat-demo/cb26-t001",
  demoUrl: "https://example.com/demo/cb26-t001",
  videoUrl: "",
});
check("upcoming gate is blocked", early.status === 403, JSON.stringify(early.json));
await send(admin.box, "/api/admin/event", "PATCH", { preset: "hour6" });

const badForm = new FormData();
badForm.set("file", new File([new Uint8Array([1, 2, 3])], "notes.exe", { type: "application/octet-stream" }));
const rejected = await fetch(`${base}/api/team/milestones/m3/files`, { method: "POST", headers: team.box.headers(), body: badForm });
check("wrong file type is rejected", rejected.status === 400, `status ${rejected.status}`);

const adminDownload = await get(admin.box, `/api/admin/files/${t001FileId}`);
check("organizer can download a squad file", adminDownload.status === 200);

const judges = await get(admin.box, "/api/admin/judges");
const otherJudge = judges.json.judges.find((item) => item.username === "judge02");
const judgeTwo = await login(otherJudge.username, otherJudge.password);
const hiddenFile = await get(judgeTwo.box, `/api/judge/files/${t001FileId}`);
check("unassigned judge cannot download the file", hiddenFile.status === 404, `status ${hiddenFile.status}`);

const beforeSim = await fetch(`${base}/api/live/board`).then((r) => r.json());
await send(admin.box, "/api/admin/event", "PATCH", { simulationEnabled: true });
await new Promise((resolve) => setTimeout(resolve, 9000));
const afterSim = await fetch(`${base}/api/live/board`).then((r) => r.json());
const moved = beforeSim.rows.some((row) => {
  const next = afterSim.rows.find((item) => item.code === row.code);
  return next && next.progressScore !== row.progressScore;
});
check("simulation advances squad progress", moved);
await send(admin.box, "/api/admin/event", "PATCH", { simulationEnabled: false });

const bad = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json", origin: "http://evil.example" },
  body: JSON.stringify({ username: "admin", password: "admin@123" }),
});
check("cross-origin login blocked", bad.status === 403, `status ${bad.status}`);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed.");
