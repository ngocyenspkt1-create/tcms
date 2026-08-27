import { spawnSync } from "node:child_process";

import {
  assertDevelopmentDatabase,
  maintenanceDatabaseUrl,
} from "./config.mjs";

const operation = process.argv[2];

if (!new Set(["backup", "restore"]).has(operation)) {
  throw new Error("Chỉ hỗ trợ backup hoặc restore.");
}

const url = await maintenanceDatabaseUrl();

assertDevelopmentDatabase(url);

const env = {
  ...process.env,
  DATABASE_URL: url,
};

const result = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    `scripts/database/${operation}.ps1`,
    ...process.argv.slice(3),
  ],
  {
    stdio: "inherit",
    env,
  },
);

process.exit(result.status ?? 1);
