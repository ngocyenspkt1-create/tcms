import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { assertDevelopmentDatabase, migrationDatabaseUrl } from "./config.mjs";

const url = await migrationDatabaseUrl();
assertDevelopmentDatabase(url);
const client = new pg.Client({ connectionString: url, application_name: "tcms-dev-migrate" });
await client.connect();
try {
  const directory = resolve("database/migrations");
  const files = (await readdir(directory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort();
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    const exists = await client.query("SELECT to_regclass('tcms.schema_migrations') IS NOT NULL AS exists");
    if (exists.rows[0].exists) {
      const applied = await client.query("SELECT 1 FROM tcms.schema_migrations WHERE version = $1", [version]);
      if (applied.rowCount) { console.log(`Bỏ qua ${file} (đã chạy).`); continue; }
    }
    console.log(`Đang chạy ${file}...`);
    await client.query(await readFile(resolve(directory, file), "utf8"));
  }
  console.log("Migration hoàn tất.");
} finally { await client.end(); }
