import { spawnSync } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import pg from "pg";

import { assertDevelopmentDatabase, maintenanceDatabaseUrl } from "./config.mjs";

const { Client } = pg;
const testDatabase = "tcms_restore_readiness_test";

async function latestBackup() {
  const backupDirectory = path.resolve("database/backups");
  const candidates = await Promise.all(
    (await readdir(backupDirectory))
      .filter((name) => name.endsWith(".dump"))
      .map(async (name) => {
        const file = path.join(backupDirectory, name);
        return { file, modifiedAt: (await stat(file)).mtimeMs };
      }),
  );
  candidates.sort((a, b) => b.modifiedAt - a.modifiedAt);
  if (!candidates[0]) throw new Error("Không tìm thấy file .dump trong database/backups.");
  return candidates[0].file;
}

const sourceUrl = await maintenanceDatabaseUrl();
assertDevelopmentDatabase(sourceUrl);

const adminUrl = new URL(sourceUrl);
adminUrl.pathname = "/postgres";
adminUrl.search = "";

const restoreUrl = new URL(sourceUrl);
restoreUrl.pathname = `/${testDatabase}`;
restoreUrl.search = "";

const backupFile = path.resolve(process.argv[2] ?? await latestBackup());
const admin = new Client({ connectionString: adminUrl.toString() });
let adminConnected = false;
let verification;
let temporaryDatabaseRemoved = false;

try {
  await admin.connect();
  adminConnected = true;
  await admin.query(`DROP DATABASE IF EXISTS ${testDatabase} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${testDatabase}`);

  const restore = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      "scripts/database/restore.ps1",
      backupFile,
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: restoreUrl.toString() },
      encoding: "utf8",
    },
  );
  if (restore.status !== 0) {
    process.stderr.write(restore.stderr || restore.stdout || "Restore thất bại.\n");
    throw new Error("RESTORE_VERIFICATION_FAILED");
  }

  const restored = new Client({ connectionString: restoreUrl.toString() });
  try {
    await restored.connect();
    const result = await restored.query(`
      SELECT
        (SELECT count(*)::int FROM tcms.schema_migrations) AS migration_count,
        to_regclass('tcms.contracts') IS NOT NULL AS has_contracts,
        to_regclass('tcms.audit_events') IS NOT NULL AS has_audit_events
    `);
    const check = result.rows[0];
    if (!check?.has_contracts || !check?.has_audit_events || check.migration_count < 1) {
      throw new Error("RESTORED_SCHEMA_INCOMPLETE");
    }
    verification = {
      restored: true,
      database: testDatabase,
      migrationCount: check.migration_count,
      hasContracts: check.has_contracts,
      hasAuditEvents: check.has_audit_events,
    };
  } finally {
    await restored.end().catch(() => undefined);
  }
} finally {
  if (adminConnected) {
    await admin.query(`DROP DATABASE IF EXISTS ${testDatabase} WITH (FORCE)`).catch(() => undefined);
    const cleanup = await admin.query(
      "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
      [testDatabase],
    ).catch(() => ({ rows: [{ exists: true }] }));
    temporaryDatabaseRemoved = cleanup.rows[0]?.exists === false;
    await admin.end().catch(() => undefined);
  }
}

if (!temporaryDatabaseRemoved) throw new Error("TEMPORARY_RESTORE_DATABASE_CLEANUP_FAILED");
console.log(JSON.stringify({ ...verification, temporaryDatabaseRemoved }, null, 2));
