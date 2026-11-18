const base = process.env.BASE || "http://127.0.0.1";

async function waitReady() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/health`);
      const body = await response.json();
      if (body.database === "ok" && body.storage === "ok") return body;
      console.log("waiting", body);
    } catch (error) {
      console.log("waiting", error instanceof Error ? error.message : error);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("The stack did not become healthy.");
}

function jar() {
  const cookies = new Map();
  return {
    headers(extra = {}) {
      const cookie = [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
      return { ...(cookie ? { cookie } : {}), ...extra };
    },
    take(response) {
      for (const line of response.headers.getSetCookie?.() || []) {
        const [pair] = line.split(";");
        const index = pair.indexOf("=");
        if (index > 0) cookies.set(pair.slice(0, index), pair.slice(index + 1));
      }
    },
  };
}

async function login(username, password) {
  const box = jar();
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ username, password }),
  });
  box.take(response);
  const body = await response.json();
  if (!response.ok) throw new Error(`login ${username}: ${JSON.stringify(body)}`);
  return { box, body };
}

async function send(box, path, method, payload) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: box.headers({ "content-type": "application/json", origin: base }),
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${path} ${response.status} ${JSON.stringify(body)}`);
  return body;
}

const health = await waitReady();
console.log("health", health);

const adminPassword = process.env.ADMIN_PASSWORD || "TempAdmin#2026";
const admin = await login(process.env.ADMIN_USERNAME || "admin", adminPassword);
if (admin.body.mustChangePassword) {
  await send(admin.box, "/api/auth/password", "POST", {
    currentPassword: adminPassword,
    newPassword: "EventAdmin#2026",
  });
}
const adminAgain = admin.body.mustChangePassword ? await login(process.env.ADMIN_USERNAME || "admin", "EventAdmin#2026") : admin;

await send(adminAgain.box, "/api/admin/event", "PATCH", { preset: "hour6" });
const created = await send(adminAgain.box, "/api/admin/teams", "POST", {
  name: "Compose Check",
  track: "RegeneraX",
  college: "IIIT Dharwad",
  members: "Asha Rao\nDev Patil",
});
const judge = await send(adminAgain.box, "/api/admin/judges", "POST", {
  name: "Compose Judge",
  title: "Floor test",
  username: `judge${Date.now().toString().slice(-6)}`,
});
const teams = await send(adminAgain.box, "/api/admin/teams", "GET");
const team = teams.teams.find((item) => item.code === created.username);
await send(adminAgain.box, `/api/admin/judges/${judge.id}/assignments`, "POST", { teamIds: [team.id] });

const squad = await login(created.username, created.password);
await send(squad.box, "/api/team/milestones/m3", "PUT", {
  statusText: "Compose stack core slice is running.",
  progress: 40,
  githubUrl: "https://example.com/compose-check",
});
const bytes = Buffer.alloc(1024 * 1024, 4);
const signed = await send(squad.box, "/api/team/milestones/m3/uploads", "POST", {
  fileName: "compose-check.pdf",
  contentType: "application/pdf",
  size: bytes.length,
});
const put = await fetch(signed.uploadUrl, { method: "PUT", headers: signed.headers, body: bytes });
if (!put.ok) throw new Error(`presigned upload failed ${put.status}`);
await send(squad.box, `/api/team/milestones/m3/uploads/${signed.fileId}/complete`, "POST", {});

const jury = await login(judge.username, judge.password);
const packet = await send(jury.box, "/api/judge/teams", "GET");
if (!packet.teams.some((item) => item.code === created.username)) throw new Error("judge missing squad");
await send(jury.box, `/api/judge/teams/${team.id}/score`, "PUT", {
  engineering: 7,
  impact: 8,
  prototype: 6,
  vision: 7,
  overallComment: "Compose check.",
  submit: true,
});

const board = await fetch(`${base}/api/live/board`).then((response) => response.json());
if (!board.rows.some((row) => row.code === created.username)) throw new Error("squad missing on the board");
const stream = await fetch(`${base}/api/live/stream`);
const chunk = await stream.body.getReader().read();
const text = new TextDecoder().decode(chunk.value);
if (!text.includes("data:")) throw new Error("SSE did not send an event");
console.log("compose end-to-end passed");
