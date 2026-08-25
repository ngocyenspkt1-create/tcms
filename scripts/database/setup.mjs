import { spawnSync } from "node:child_process";

for (const task of ["db:create", "db:migrate", "db:grant", "db:seed", "db:check"]) {
  const result = spawnSync("npm.cmd", ["run", task], { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
