import { execSync } from "node:child_process";

execSync("npx prisma migrate deploy", { stdio: "inherit" });
console.log("Migrations are applied. Run npm run seed:production once on a new database.");
