import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const example = path.join(root, ".env.example");
if (!fs.existsSync(envPath) && fs.existsSync(example)) {
  fs.copyFileSync(example, envPath);
}
fs.mkdirSync(path.join(root, "data", "uploads"), { recursive: true });
