import fs from "node:fs";
import { spawn } from "node:child_process";

if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

const port = process.env.PORT || "4317";
const host = process.env.HOST || "0.0.0.0";
const child = spawn("npx", ["next", "start", "-H", host, "-p", port], {
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
